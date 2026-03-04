const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const config = require('../../config');

class TenantsService {

  async listar(query = {}, skip = 0, take = 20) {
    const where = {};
    if (query.ativo !== undefined) where.ativo = query.ativo !== 'false';
    if (query.q) where.OR = [{ nome: { contains: query.q } }, { cnpj: { contains: query.q } }];

    const [dados, total] = await prisma.$transaction([
      prisma.tenant.findMany({
        where, skip, take,
        orderBy: { nome: 'asc' },
        include: { _count: { select: { servidores: true, usuarios: true } } },
      }),
      prisma.tenant.count({ where }),
    ]);
    return { dados, total };
  }

  async criar(dados) {
    const dup = await prisma.tenant.findUnique({ where: { cnpj: dados.cnpj } });
    if (dup) throw Errors.ALREADY_EXISTS('CNPJ já cadastrado');

    const tenant = await prisma.tenant.create({
      data: { ...dados, ativo: true, limiteServidores: dados.limiteServidores || 500 },
    });

    // Cria roles padrão para o tenant
    await this._criarRolesPadrao(tenant.id);

    return tenant;
  }

  async buscar(id) {
    const t = await prisma.tenant.findUnique({
      where: { id },
      include: { _count: { select: { servidores: true, usuarios: true } } },
    });
    if (!t) throw Errors.TENANT_NOT_FOUND();
    return t;
  }

  async atualizar(id, dados) {
    await this.buscar(id);
    return prisma.tenant.update({ where: { id }, data: dados });
  }

  async alterarStatus(id, ativo) {
    await this.buscar(id);
    return prisma.tenant.update({ where: { id }, data: { ativo } });
  }

  async usuarios(tenantId, skip = 0, take = 20) {
    await this.buscar(tenantId);
    const where = { tenantId };
    const [dados, total] = await prisma.$transaction([
      prisma.usuario.findMany({
        where, skip, take,
        orderBy: { nome: 'asc' },
        select: {
          id: true, nome: true, email: true, ativo: true, mfaAtivado: true, ultimoLogin: true,
          roles: { include: { role: { select: { nome: true } } } },
        },
      }),
      prisma.usuario.count({ where }),
    ]);
    return { dados, total };
  }

  async criarUsuario(tenantId, { nome, email, senha, servidorId, roleIds }) {
    await this.buscar(tenantId);

    const dup = await prisma.usuario.findFirst({ where: { email, tenantId } });
    if (dup) throw Errors.ALREADY_EXISTS('E-mail já cadastrado neste órgão');

    const senhaHash = await bcrypt.hash(senha, config.bcrypt.rounds);

    const usuario = await prisma.usuario.create({
      data: {
        tenantId, nome, email, senhaHash, ativo: true,
        servidorId: servidorId || null,
        roles: roleIds?.length
          ? { create: roleIds.map(rid => ({ roleId: rid })) }
          : undefined,
      },
      select: { id: true, nome: true, email: true, ativo: true, createdAt: true },
    });

    return usuario;
  }

  async atualizarUsuario(tenantId, uid, dados) {
    const u = await prisma.usuario.findFirst({ where: { id: uid, tenantId } });
    if (!u) throw Errors.NOT_FOUND('Usuário');

    if (dados.senha) {
      dados.senhaHash = await bcrypt.hash(dados.senha, config.bcrypt.rounds);
      delete dados.senha;
    }

    return prisma.usuario.update({ where: { id: uid }, data: dados });
  }

  async atribuirRoles(tenantId, uid, roleIds) {
    const u = await prisma.usuario.findFirst({ where: { id: uid, tenantId } });
    if (!u) throw Errors.NOT_FOUND('Usuário');

    // Remove roles atuais e insere os novos
    await prisma.$transaction([
      prisma.usuarioRole.deleteMany({ where: { usuarioId: uid } }),
      prisma.usuarioRole.createMany({
        data: roleIds.map(rid => ({ usuarioId: uid, roleId: rid })),
      }),
    ]);

    return prisma.usuario.findUnique({
      where: { id: uid },
      include: { roles: { include: { role: true } } },
    });
  }

  async listarRoles(tenantId) {
    return prisma.role.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] }, // globais + do tenant
      include: { _count: { select: { permissions: true, usuarios: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async criarRole(tenantId, { nome, descricao, permissionIds }) {
    const role = await prisma.role.create({
      data: { tenantId, nome, descricao },
    });

    if (permissionIds?.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(pid => ({ roleId: role.id, permissionId: pid })),
      });
    }

    return role;
  }

  async criarPermission({ recurso, acao, descricao }) {
    const dup = await prisma.permission.findFirst({ where: { recurso, acao } });
    if (dup) throw Errors.ALREADY_EXISTS(`Permissão ${recurso}:${acao}`);
    return prisma.permission.create({ data: { recurso, acao, descricao } });
  }

  // ── Roles padrão criadas automaticamente ao criar tenant ──

  async _criarRolesPadrao(tenantId) {
    // Busca todas as permissões cadastradas
    const todasPermissoes = await prisma.permission.findMany();
    const permIds = todasPermissoes.map(p => p.id);

    const roles = [
      { nome: 'ADMIN_ORGAO',  descricao: 'Administrador do Órgão — acesso total ao tenant', permIds },
      { nome: 'GESTOR_RH',    descricao: 'Gestor de RH — acesso a todos os módulos exceto configurações', permIds: permIds.filter(() => true) },
      { nome: 'GESTOR_PONTO', descricao: 'Gestor de Ponto — acesso restrito ao módulo de ponto', permIds: [] },
      { nome: 'CHEFE_SETOR',  descricao: 'Chefe de Setor — visualização e aprovações da sua lotação', permIds: [] },
      { nome: 'SERVIDOR',     descricao: 'Servidor — acesso ao portal self-service (holerite, férias, dados)', permIds: [] },
      { nome: 'AUDITOR',      descricao: 'Auditor — acesso read-only a todos os módulos', permIds: [] },
    ];

    for (const r of roles) {
      const role = await prisma.role.create({
        data: { tenantId, nome: r.nome, descricao: r.descricao },
      });
      if (r.permIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: r.permIds.map(pid => ({ roleId: role.id, permissionId: pid })),
          skipDuplicates: true,
        });
      }
    }
  }
}

module.exports = TenantsService;
