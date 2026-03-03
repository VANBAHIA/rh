import { useState } from 'react'
import {
  Settings, Building2, User, Users, Sliders, Link2,
  Save, Loader2, Eye, EyeOff, Copy, Check, RefreshCw, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'
import { extractApiError } from '@/services/api'

type Tab = 'tenant' | 'perfil' | 'usuarios' | 'parametros' | 'integracao'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'tenant',      label: 'Prefeitura',      icon: Building2 },
  { id: 'perfil',      label: 'Meu perfil',       icon: User },
  { id: 'usuarios',    label: 'Usuários do RH',   icon: Users },
  { id: 'parametros',  label: 'Parâmetros',        icon: Sliders },
  { id: 'integracao',  label: 'API / Integração',  icon: Link2 },
]

// ── helpers ────────────────────────────────────────────────────────────────

function FieldRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start py-5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  )
}

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
    </div>
  )
}

// ── Aba Tenant ─────────────────────────────────────────────────────────────

function TabTenant() {
  const { usuario } = useAuthStore()
  const [form, setForm] = useState({
    nomeCompleto: usuario?.tenant?.nome ?? '',
    cnpj: '',
    prefeito: '',
    secretarioRH: '',
    endereco: '',
    telefone: '',
    emailInstitucional: '',
    site: '',
    brasao: '',
    corPrimaria: '#1e3a5f',
    exercicioFinanceiro: new Date().getFullYear().toString(),
  })
  const [saving, setSaving] = useState(false)

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/tenant', form)
      toast({ title: 'Configurações da prefeitura salvas!' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Dados da Prefeitura" desc="Informações institucionais exibidas em documentos e no portal de transparência." />
      <FieldRow label="Nome completo" desc="Nome oficial do ente municipal">
        <Input value={form.nomeCompleto} onChange={update('nomeCompleto')} className="h-10" placeholder="Prefeitura Municipal de..." />
      </FieldRow>
      <FieldRow label="CNPJ">
        <Input value={form.cnpj} onChange={update('cnpj')} className="h-10 font-mono" placeholder="00.000.000/0001-00" />
      </FieldRow>
      <FieldRow label="Prefeito(a)">
        <Input value={form.prefeito} onChange={update('prefeito')} className="h-10" />
      </FieldRow>
      <FieldRow label="Secretário(a) de RH">
        <Input value={form.secretarioRH} onChange={update('secretarioRH')} className="h-10" />
      </FieldRow>
      <FieldRow label="Endereço">
        <Input value={form.endereco} onChange={update('endereco')} className="h-10" placeholder="Rua, nº, Cidade/UF" />
      </FieldRow>
      <FieldRow label="Telefone">
        <Input value={form.telefone} onChange={update('telefone')} className="h-10 font-mono" placeholder="(00) 0000-0000" />
      </FieldRow>
      <FieldRow label="E-mail institucional">
        <Input type="email" value={form.emailInstitucional} onChange={update('emailInstitucional')} className="h-10" />
      </FieldRow>
      <FieldRow label="Site oficial">
        <Input value={form.site} onChange={update('site')} className="h-10 font-mono" placeholder="https://..." />
      </FieldRow>
      <FieldRow label="Exercício financeiro" desc="Ano base para relatórios e cálculos">
        <Input value={form.exercicioFinanceiro} onChange={update('exercicioFinanceiro')} className="h-10 w-32 font-mono" />
      </FieldRow>

      <div className="flex justify-end pt-2">
        <Button variant="gov" onClick={handleSave} disabled={saving} className="min-w-[160px]">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
        </Button>
      </div>
    </div>
  )
}

// ── Aba Perfil ─────────────────────────────────────────────────────────────

function TabPerfil() {
  const { usuario } = useAuthStore()
  const [form, setForm] = useState({ nome: usuario?.nome ?? '', email: usuario?.email ?? '' })
  const [senha, setSenha] = useState({ atual: '', nova: '', confirmar: '' })
  const [showSenha, setShowSenha] = useState({ atual: false, nova: false })
  const [saving, setSaving] = useState(false)
  const [savingSenha, setSavingSenha] = useState(false)

  const handleSalvar = async () => {
    setSaving(true)
    try {
      await api.put('/auth/perfil', form)
      toast({ title: 'Perfil atualizado!' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setSaving(false) }
  }

  const handleAlterarSenha = async () => {
    if (senha.nova !== senha.confirmar) {
      toast({ variant: 'destructive', title: 'As senhas não coincidem.' }); return
    }
    if (senha.nova.length < 8) {
      toast({ variant: 'destructive', title: 'A senha deve ter no mínimo 8 caracteres.' }); return
    }
    setSavingSenha(true)
    try {
      await api.put('/auth/senha', { senhaAtual: senha.atual, novaSenha: senha.nova })
      toast({ title: 'Senha alterada com sucesso!' })
      setSenha({ atual: '', nova: '', confirmar: '' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setSavingSenha(false) }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <SectionHeader title="Informações do perfil" />
        <div className="mt-4 space-y-4">
          <FieldRow label="Nome">
            <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="h-10" />
          </FieldRow>
          <FieldRow label="E-mail">
            <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-10" />
          </FieldRow>
          <FieldRow label="Perfil de acesso">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
                {usuario?.perfil}
              </span>
              <p className="text-xs text-muted-foreground">Para alterar o perfil, contate o administrador do sistema.</p>
            </div>
          </FieldRow>
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="gov" onClick={handleSalvar} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar perfil
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <SectionHeader title="Alterar senha" desc="A senha deve ter no mínimo 8 caracteres com letras e números." />
        <div className="mt-4 space-y-3">
          {[
            { label: 'Senha atual', key: 'atual' as const, show: showSenha.atual, toggle: () => setShowSenha(p => ({ ...p, atual: !p.atual })) },
            { label: 'Nova senha', key: 'nova' as const, show: showSenha.nova, toggle: () => setShowSenha(p => ({ ...p, nova: !p.nova })) },
            { label: 'Confirmar nova senha', key: 'confirmar' as const, show: showSenha.nova, toggle: () => {} },
          ].map(({ label, key, show, toggle }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <div className="relative max-w-sm">
                <Input
                  type={show ? 'text' : 'password'}
                  value={senha[key]}
                  onChange={e => setSenha(p => ({ ...p, [key]: e.target.value }))}
                  className="h-10 pr-10"
                />
                {key !== 'confirmar' && (
                  <button type="button" onClick={toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={handleAlterarSenha} disabled={savingSenha} className="mt-2">
            {savingSenha ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
            Alterar senha
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Aba Usuários ───────────────────────────────────────────────────────────

function TabUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useState(() => {
    api.get('/usuarios').then(r => setUsuarios((r.data as any).data ?? [])).catch(() => setUsuarios([])).finally(() => setLoading(false))
  })

  const PERFIS = ['RH', 'CHEFE_PESSOAL', 'CONTADOR', 'GESTOR', 'ADMIN']

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      await api.patch(`/usuarios/${id}`, { ativo: !ativo })
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u))
      toast({ title: `Usuário ${!ativo ? 'ativado' : 'desativado'}.` })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    }
  }

  const handleAlterarPerfil = async (id: string, perfil: string) => {
    try {
      await api.patch(`/usuarios/${id}`, { perfil })
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, perfil } : u))
      toast({ title: 'Perfil alterado.' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Usuários do sistema" desc="Gerencie os usuários com acesso ao GovHRPub." />
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Usuário', 'Perfil', 'Status', 'Último acesso', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                </tr>
              )) : usuarios.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum usuário encontrado.
                </td></tr>
              ) : usuarios.map((u: any) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.nome}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={u.perfil} onValueChange={v => handleAlterarPerfil(u.id, v)}>
                      <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERFIS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                      u.ativo ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200')}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => handleToggleAtivo(u.id, u.ativo)}>
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Aba Parâmetros ─────────────────────────────────────────────────────────

const PARAMETROS_DEFAULTS = [
  { chave: 'INTERSTICIO_HORIZONTAL_MESES',    label: 'Interstício horizontal (meses)',          valor: '24',    desc: 'Meses entre progressões horizontais (Art. 26 PCCV)' },
  { chave: 'LIMITE_FERIAS_PARCELAS',           label: 'Limite de parcelamento de férias',        valor: '3',     desc: 'Número máximo de parcelas de férias' },
  { chave: 'TETO_HORA_EXTRA_MENSAL',           label: 'Teto de horas extras mensais',            valor: '40',    desc: 'Máximo de horas extras por servidor por mês' },
  { chave: 'DIAS_AVISO_FERIAS_VENCIMENTO',     label: 'Aviso antecedência férias (dias)',        valor: '60',    desc: 'Dias antes do vencimento para emitir alerta' },
  { chave: 'ALIQUOTA_RPPS',                    label: 'Alíquota RPPS (%)',                       valor: '14.0',  desc: 'Contribuição previdenciária do servidor (EC 103)' },
  { chave: 'PERCENTUAL_ADICIONAL_NOTURNO',     label: 'Adicional noturno (%)',                  valor: '25',    desc: 'Percentual sobre hora noturna (22h–5h)' },
  { chave: 'PRAZO_ESTAGIO_PROBATORIO_MESES',   label: 'Estágio probatório (meses)',             valor: '36',    desc: 'Duração do estágio probatório' },
  { chave: 'PRAZO_SINDICANCIA_DIAS',           label: 'Prazo sindicância (dias)',                valor: '30',    desc: 'Prazo máximo para conclusão de sindicância' },
  { chave: 'PRAZO_PAD_DIAS',                   label: 'Prazo PAD (dias)',                        valor: '60',    desc: 'Prazo máximo para conclusão do PAD' },
]

function TabParametros() {
  const [params, setParams] = useState(PARAMETROS_DEFAULTS)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/configuracoes/parametros', { parametros: params.map(p => ({ chave: p.chave, valor: p.valor })) })
      toast({ title: 'Parâmetros salvos com sucesso!' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Parâmetros do sistema" desc="Configure os valores utilizados nos cálculos e regras de negócio." />
      <div className="space-y-0 divide-y divide-border border border-border rounded-xl overflow-hidden">
        {params.map((p, idx) => (
          <div key={p.chave} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{p.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">{p.chave}</p>
            </div>
            <Input
              value={p.valor}
              onChange={e => setParams(prev => prev.map((x, i) => i === idx ? { ...x, valor: e.target.value } : x))}
              className="h-9 w-28 text-right font-mono text-sm shrink-0"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="gov" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Salvar parâmetros</>}
        </Button>
      </div>
    </div>
  )
}

// ── Aba Integração ─────────────────────────────────────────────────────────

function TabIntegracao() {
  const [apiKey, setApiKey] = useState('sk-govhr-••••••••••••••••••••••••••••••••')
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    if (!confirm('Gerar nova chave? A chave anterior será invalidada imediatamente.')) return
    setRegenerating(true)
    try {
      const { data: res } = await api.post('/configuracoes/api-key/regenerar')
      setApiKey((res as any).apiKey)
      toast({ title: 'Nova chave de API gerada!' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setRegenerating(false) }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <SectionHeader title="Chave de API" desc="Use esta chave para autenticar requisições à API REST do GovHRPub em sistemas externos." />
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              readOnly
              className="h-10 font-mono text-sm pr-24 bg-muted/50"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button onClick={() => setShowKey(p => !p)} className="p-1.5 text-muted-foreground hover:text-foreground rounded">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={handleCopy} className="p-1.5 text-muted-foreground hover:text-foreground rounded">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Regenerar chave
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <SectionHeader title="Endpoints disponíveis" desc="Base URL: https://govhrpub.seudominio.gov.br/api/v1" />
        <div className="mt-4 space-y-2">
          {[
            { method: 'GET',    path: '/servidores',                        desc: 'Listagem paginada de servidores' },
            { method: 'GET',    path: '/servidores/:id',                    desc: 'Perfil completo do servidor' },
            { method: 'GET',    path: '/folha',                             desc: 'Histórico de folhas de pagamento' },
            { method: 'GET',    path: '/folha/holerite/:id/:competencia',   desc: 'Holerite individual' },
            { method: 'GET',    path: '/transparencia/servidores',          desc: 'Quadro público de servidores (sem JWT)' },
            { method: 'GET',    path: '/transparencia/folha',               desc: 'Dados públicos de remuneração (sem JWT)' },
            { method: 'POST',   path: '/progressao/lote',                   desc: 'Aplicar progressões em lote' },
            { method: 'POST',   path: '/folha/processar',                   desc: 'Processar folha de pagamento' },
          ].map(ep => (
            <div key={ep.path} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border">
              <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 mt-0.5',
                ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}>
                {ep.method}
              </span>
              <div>
                <p className="text-xs font-mono text-foreground">{ep.path}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <SectionHeader title="Webhooks" desc="Receba notificações automáticas em seu sistema quando eventos ocorrem no GovHRPub." />
        <div className="mt-4 space-y-3">
          <FieldRow label="URL do webhook">
            <Input placeholder="https://seusistema.gov.br/webhook/govhr" className="h-10 font-mono text-sm" />
          </FieldRow>
          <div className="space-y-2">
            {[
              { ev: 'servidor.criado',         checked: true },
              { ev: 'progressao.aplicada',      checked: true },
              { ev: 'folha.processada',         checked: true },
              { ev: 'licenca.aprovada',         checked: false },
              { ev: 'ferias.aprovada',          checked: false },
            ].map(({ ev, checked }) => (
              <label key={ev} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked={checked} className="rounded border-border" />
                <span className="text-sm font-mono text-foreground">{ev}</span>
              </label>
            ))}
          </div>
          <Button variant="gov" size="sm">
            <Save className="w-4 h-4 mr-2" />Salvar webhook
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tenant')

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Preferências do sistema, parâmetros de RH e integrações
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px shrink-0',
                activeTab === id
                  ? 'border-gov-600 text-gov-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'tenant'     && <TabTenant />}
          {activeTab === 'perfil'     && <TabPerfil />}
          {activeTab === 'usuarios'   && <TabUsuarios />}
          {activeTab === 'parametros' && <TabParametros />}
          {activeTab === 'integracao' && <TabIntegracao />}
        </div>
      </div>
    </div>
  )
}
