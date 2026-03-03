import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Loader2, User, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { servidoresApi } from '@/services/servidores'
import { cargosApi, comissionadosApi } from '@/services/modules'
import {
  REGIME_LABELS,
  ESTADO_CIVIL_LABELS,
  COR_RACA_LABELS,
  TURNO_LABELS,
  TITULACAO_LABELS,
  type RegimeJuridico,
  type EstadoCivil,
  type CorRaca,
  type TurnoTrabalho,
  type Cargo,
  type Lotacao,
  type TabelaSalarial,
  type NivelSalarial,
} from '@/types/servidor'
import { cn, formatCPF } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  nome:          z.string().min(5, 'Nome completo obrigatório'),
  cpf:           z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido — formato: 000.000.000-00'),
  dataNascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  sexo:          z.enum(['MASCULINO', 'FEMININO', 'NAO_INFORMADO']),
  estadoCivil:   z.enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO']),
  corRaca:       z.enum(['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA', 'NAO_INFORMADO']).optional(),
  nomeSocial:    z.string().optional(),
  rg:            z.string().optional(),
  rgOrgaoEmissor: z.string().optional(),
  rgUf:          z.string().length(2).optional().or(z.literal('')),
  pisPasep:      z.string().optional(),
  tituloEleitor: z.string().optional(),
  regimeJuridico:        z.enum(['ESTATUTARIO', 'CELETISTA', 'COMISSIONADO', 'ESTAGIARIO', 'TEMPORARIO', 'AGENTE_POLITICO']),
  cargoId:               z.string().min(1, 'Cargo obrigatório'),
  tabelaSalarialId:      z.string().optional(),
  nivelSalarialId:       z.string().optional(),
  gratificacaoFuncaoId:  z.string().optional(),
  lotacaoId:             z.string().min(1, 'Lotação obrigatória'),
  dataAdmissao:     z.string().min(1, 'Data de admissão obrigatória'),
  dataPosse:        z.string().optional(),
  dataExercicio:    z.string().optional(),
  cargaHoraria:     z.coerce.number().int().positive().optional(),
  turno:            z.enum(['MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'PLANTAO_12x36', 'PLANTAO_24x48']).optional(),
  nivelTitulacao:   z.string().optional(),
  titulacaoComprovada: z.enum(['FUNDAMENTAL_INCOMPLETO','FUNDAMENTAL_COMPLETO','MEDIO_INCOMPLETO','MEDIO_COMPLETO','TECNICO','SUPERIOR_INCOMPLETO','SUPERIOR_COMPLETO','POS_GRADUACAO','MESTRADO','DOUTORADO']).optional(),
  portaria:         z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Sub-componentes ────────────────────────────────────────────────────────

function FieldGroup({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(error && 'text-destructive')}>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="w-4 h-4 text-indigo-500" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function NovoServidorPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const [todosOsCargos, setTodosOsCargos]   = useState<Cargo[]>([])
  const [lotacoes, setLotacoes]             = useState<Lotacao[]>([])
  const [tabelas, setTabelas]               = useState<TabelaSalarial[]>([])
  const [niveis, setNiveis]                 = useState<NivelSalarial[]>([])
  const [gratificacoes, setGratificacoes]   = useState<any[]>([])
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      regimeJuridico: 'ESTATUTARIO',
      sexo:       'NAO_INFORMADO',
      estadoCivil: 'SOLTEIRO',
      corRaca:    'NAO_INFORMADO',
      cargaHoraria: 40,
      turno:      'INTEGRAL',
    },
  })

  const cpfValue         = watch('cpf') ?? ''
  const tabelaId         = watch('tabelaSalarialId')
  const regimeAtual      = watch('regimeJuridico') as RegimeJuridico

  const cargosFiltrados = todosOsCargos.filter(c =>
    !regimeAtual || c.regimeJuridico === regimeAtual
  )

  const tabelasFiltradas = tabelas.filter((t: any) =>
    !regimeAtual || !t.regime || t.regime === regimeAtual
  )

  const fetchCatalogos = useCallback(async () => {
    setLoadingCatalogos(true)
    try {
      const [cargosRes, lotacoesRes, tabelasRes, gfsRes] = await Promise.all([
        cargosApi.listar(),
        cargosApi.lotacoes(),
        cargosApi.tabelas(),
        comissionadosApi.gratificacoes({ ativo: 'true' }),
      ])
      setTodosOsCargos(cargosRes.data?.data ?? cargosRes.data ?? [])
      setLotacoes(lotacoesRes.data?.data ?? lotacoesRes.data ?? [])
      setTabelas(tabelasRes.data?.data ?? tabelasRes.data ?? [])
      setGratificacoes(gfsRes.data?.data ?? gfsRes.data ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao carregar catálogos', description: extractApiError(err) })
    } finally {
      setLoadingCatalogos(false)
    }
  }, [])

  useEffect(() => { fetchCatalogos() }, [fetchCatalogos])

  useEffect(() => {
    if (!tabelaId) { setNiveis([]); return }
    cargosApi.niveis(tabelaId)
      .then(res => setNiveis(res.data?.data ?? res.data ?? []))
      .catch(() => setNiveis([]))
  }, [tabelaId])

  useEffect(() => {
    setValue('cargoId', '')
    setValue('tabelaSalarialId', '')
    setValue('nivelSalarialId', '')
  }, [regimeAtual, setValue])

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cpf', formatCPF(e.target.value), { shouldValidate: true })
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const {
        regimeJuridico, cargoId, tabelaSalarialId, nivelSalarialId, gratificacaoFuncaoId,
        lotacaoId, dataAdmissao, dataPosse, dataExercicio,
        cargaHoraria, turno, nivelTitulacao, titulacaoComprovada, portaria,
        ...pessoais
      } = data

      const payload = {
        ...pessoais,
        cpf: pessoais.cpf.replace(/\D/g, ''),
        vinculo: {
          regimeJuridico,
          cargoId,
          lotacaoId,
          dataAdmissao,
          ...(tabelaSalarialId     && { tabelaSalarialId }),
          ...(nivelSalarialId      && { nivelSalarialId }),
          ...(gratificacaoFuncaoId && { gratificacaoFuncaoId }),
          ...(dataPosse      && { dataPosse }),
          ...(dataExercicio  && { dataExercicio }),
          ...(cargaHoraria   && { cargaHoraria }),
          ...(turno          && { turno }),
          ...(nivelTitulacao && { nivelTitulacao }),
          ...(titulacaoComprovada && { titulacaoComprovada }),
          ...(portaria       && { portaria }),
        },
      }

      const { data: res } = await servidoresApi.criar(payload)
      toast({ title: 'Servidor cadastrado!', description: `Matrícula: ${res.data.matricula}` })
      navigate(`/servidores/${res.data.id}`)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao cadastrar', description: extractApiError(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/servidores')} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Novo Servidor</h1>
          <p className="text-muted-foreground text-sm">Preencha os dados para cadastrar o servidor.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">

          {/* ── Dados Pessoais ─────────────────────────────────── */}
          <SectionTitle icon={User} title="Dados Pessoais" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldGroup label="Nome completo" required error={errors.nome?.message}>
                <Input placeholder="Nome completo do servidor" {...register('nome')}
                  className={cn('h-10', errors.nome && 'border-destructive')} />
              </FieldGroup>
            </div>

            <FieldGroup label="Nome social" error={errors.nomeSocial?.message}>
              <Input placeholder="Opcional" {...register('nomeSocial')} className="h-10" />
            </FieldGroup>

            <FieldGroup label="CPF" required error={errors.cpf?.message}>
              <Input placeholder="000.000.000-00" value={cpfValue} onChange={handleCpfChange}
                className={cn('h-10 font-mono', errors.cpf && 'border-destructive')} />
            </FieldGroup>

            <FieldGroup label="Data de nascimento" required error={errors.dataNascimento?.message}>
              <Input type="date" {...register('dataNascimento')}
                className={cn('h-10', errors.dataNascimento && 'border-destructive')} />
            </FieldGroup>

            <FieldGroup label="Sexo" required error={errors.sexo?.message}>
              <Select defaultValue="NAO_INFORMADO" onValueChange={v => setValue('sexo', v as FormData['sexo'])}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASCULINO">Masculino</SelectItem>
                  <SelectItem value="FEMININO">Feminino</SelectItem>
                  <SelectItem value="NAO_INFORMADO">Não informado</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Estado civil" required error={errors.estadoCivil?.message}>
              <Select defaultValue="SOLTEIRO" onValueChange={v => setValue('estadoCivil', v as EstadoCivil)}>
                <SelectTrigger className={cn('h-10', errors.estadoCivil && 'border-destructive')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADO_CIVIL_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Cor/Raça" error={errors.corRaca?.message}>
              <Select defaultValue="NAO_INFORMADO" onValueChange={v => setValue('corRaca', v as CorRaca)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COR_RACA_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="RG" error={errors.rg?.message}>
              <Input placeholder="0000000" {...register('rg')} className="h-10" />
            </FieldGroup>

            <FieldGroup label="Órgão emissor / UF">
              <div className="flex gap-2">
                <Input placeholder="SSP" {...register('rgOrgaoEmissor')} className="h-10 flex-1" />
                <Input placeholder="UF" {...register('rgUf')} className="h-10 w-16 text-center" maxLength={2} />
              </div>
            </FieldGroup>

            <FieldGroup label="PIS/PASEP">
              <Input placeholder="000.00000.00-0" {...register('pisPasep')} className="h-10 font-mono" />
            </FieldGroup>

            <FieldGroup label="Título de eleitor">
              <Input placeholder="0000 0000 0000" {...register('tituloEleitor')} className="h-10 font-mono" />
            </FieldGroup>
          </div>

          {/* ── Dados Funcionais ───────────────────────────────── */}
          <SectionTitle icon={Briefcase} title="Dados Funcionais" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <FieldGroup label="Regime jurídico" required error={errors.regimeJuridico?.message}>
              <Select defaultValue="ESTATUTARIO" onValueChange={v => setValue('regimeJuridico', v as RegimeJuridico)}>
                <SelectTrigger className={cn('h-10', errors.regimeJuridico && 'border-destructive')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REGIME_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Data de admissão" required error={errors.dataAdmissao?.message}>
              <Input type="date" {...register('dataAdmissao')}
                className={cn('h-10', errors.dataAdmissao && 'border-destructive')} />
            </FieldGroup>

            <FieldGroup label="Data de posse" error={errors.dataPosse?.message}>
              <Input type="date" {...register('dataPosse')} className="h-10" />
            </FieldGroup>

            <FieldGroup label="Data de exercício" error={errors.dataExercicio?.message}>
              <Input type="date" {...register('dataExercicio')} className="h-10" />
            </FieldGroup>

            <FieldGroup label="Cargo" required error={errors.cargoId?.message}>
              <Select onValueChange={v => setValue('cargoId', v, { shouldValidate: true })}>
                <SelectTrigger className={cn('h-10', errors.cargoId && 'border-destructive')}>
                  <SelectValue placeholder={loadingCatalogos ? 'Carregando...' : cargosFiltrados.length === 0 ? 'Nenhum cargo para este regime' : 'Selecione o cargo'} />
                </SelectTrigger>
                <SelectContent>
                  {cargosFiltrados.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Lotação" required error={errors.lotacaoId?.message}>
              <Select onValueChange={v => setValue('lotacaoId', v, { shouldValidate: true })}>
                <SelectTrigger className={cn('h-10', errors.lotacaoId && 'border-destructive')}>
                  <SelectValue placeholder={loadingCatalogos ? 'Carregando...' : 'Selecione a lotação'} />
                </SelectTrigger>
                <SelectContent>
                  {lotacoes.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.sigla} — {l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Tabela salarial" error={errors.tabelaSalarialId?.message}>
              <Select onValueChange={v => {
                setValue('tabelaSalarialId', v, { shouldValidate: true })
                setValue('nivelSalarialId', '')
              }}>
                <SelectTrigger className={cn('h-10', errors.tabelaSalarialId && 'border-destructive')}>
                  <SelectValue placeholder={loadingCatalogos ? 'Carregando...' : 'Selecione a tabela'} />
                </SelectTrigger>
                <SelectContent>
                  {tabelasFiltradas.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Nível salarial" error={errors.nivelSalarialId?.message}>
              <Select
                disabled={!tabelaId || niveis.length === 0}
                onValueChange={v => setValue('nivelSalarialId', v, { shouldValidate: true })}
              >
                <SelectTrigger className={cn('h-10', errors.nivelSalarialId && 'border-destructive')}>
                  <SelectValue placeholder={!tabelaId ? 'Selecione a tabela primeiro' : 'Selecione o nível'} />
                </SelectTrigger>
                <SelectContent>
                  {niveis.map(n => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.nivel}-{n.classe} — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n.vencimentoBase)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Gratificação de Função (GF)">
              <Select onValueChange={v => setValue('gratificacaoFuncaoId', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={loadingCatalogos ? 'Carregando...' : 'Selecione a GF (opcional)'} />
                </SelectTrigger>
                <SelectContent>
                  {gratificacoes.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.simbolo} — {Number(g.percentual).toFixed(2)}%{g.descricao ? ` (${g.descricao})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Carga horária semanal" error={errors.cargaHoraria?.message}>
              <Input type="number" min={1} max={44} defaultValue={40} {...register('cargaHoraria')} className="h-10" />
            </FieldGroup>

            <FieldGroup label="Turno" error={errors.turno?.message}>
              <Select defaultValue="INTEGRAL" onValueChange={v => setValue('turno', v as TurnoTrabalho)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TURNO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Titulação comprovada" error={errors.titulacaoComprovada?.message}>
              <Select onValueChange={v => setValue('titulacaoComprovada', v as FormData['titulacaoComprovada'])}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TITULACAO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Portaria / Ato de admissão" error={errors.portaria?.message}>
              <Input placeholder="Ex: Portaria nº 001/2026" {...register('portaria')} className="h-10" />
            </FieldGroup>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-4">
          <Button type="button" variant="outline" onClick={() => navigate('/servidores')} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="gov" disabled={submitting || loadingCatalogos} className="min-w-[160px]">
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Cadastrar Servidor</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
