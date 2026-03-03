import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Save, Loader2, User, Briefcase, Phone,
  MapPin, FileText, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { servidoresApi } from '@/services/servidores'
import type { Servidor, EstadoCivil, CorRaca } from '@/types/servidor'
import { ESTADO_CIVIL_LABELS, COR_RACA_LABELS } from '@/types/servidor'
import { cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  nome:           z.string().min(5, 'Nome obrigatório'),
  nomeSocial:     z.string().optional(),
  dataNascimento: z.string().optional(),
  sexo:           z.enum(['MASCULINO', 'FEMININO', 'NAO_INFORMADO']).optional(),
  estadoCivil:    z.enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO']).optional(),
  corRaca:        z.enum(['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA', 'NAO_INFORMADO']).optional(),
  naturalidade:   z.string().optional(),
  nacionalidade:  z.string().optional(),
  pne:            z.boolean().optional(),
  tipoPne:        z.string().optional(),
  rg:             z.string().optional(),
  rgOrgaoEmissor: z.string().optional(),
  rgUf:           z.string().optional(),
  rgDataEmissao:  z.string().optional(),
  pisPasep:       z.string().optional(),
  tituloEleitor:  z.string().optional(),
  numeroCtps:     z.string().optional(),
  serieCtps:      z.string().optional(),
  ufCtps:         z.string().optional(),
  matriculaRpps:  z.string().optional(),
  matriculaInss:  z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Tab = 'pessoal' | 'documentos' | 'contato'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'pessoal',    label: 'Dados Pessoais', icon: User },
  { id: 'documentos', label: 'Documentos',     icon: FileText },
  { id: 'contato',    label: 'Contato',        icon: Phone },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function Field({ label, error, children, className }: {
  label: string; error?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className={cn('text-xs', error && 'text-destructive')}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  )
}

// ── Abas ───────────────────────────────────────────────────────────────────

function TabPessoal({ register, setValue, watch, errors }: any) {
  return (
    <div className="space-y-6">
      <Section title="Identificação" icon={User}>
        <Field label="Nome completo *" error={errors.nome?.message} className="lg:col-span-2">
          <Input {...register('nome')} className={cn('h-10', errors.nome && 'border-destructive')} />
        </Field>
        <Field label="Nome social">
          <Input {...register('nomeSocial')} className="h-10" placeholder="Opcional" />
        </Field>
        <Field label="Data de nascimento">
          <Input type="date" {...register('dataNascimento')} className="h-10" />
        </Field>
        <Field label="Sexo">
          <Select value={watch('sexo') ?? ''} onValueChange={v => setValue('sexo', v)}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MASCULINO">Masculino</SelectItem>
              <SelectItem value="FEMININO">Feminino</SelectItem>
              <SelectItem value="NAO_INFORMADO">Não informado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado civil">
          <Select value={watch('estadoCivil') ?? ''} onValueChange={v => setValue('estadoCivil', v as EstadoCivil)}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {Object.entries(ESTADO_CIVIL_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Cor/Raça">
          <Select value={watch('corRaca') ?? ''} onValueChange={v => setValue('corRaca', v as CorRaca)}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {Object.entries(COR_RACA_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Naturalidade">
          <Input {...register('naturalidade')} className="h-10" placeholder="Cidade/UF" />
        </Field>
        <Field label="Nacionalidade">
          <Input {...register('nacionalidade')} className="h-10" placeholder="Brasileira" />
        </Field>
      </Section>
    </div>
  )
}

function TabDocumentos({ register }: any) {
  return (
    <div className="space-y-6">
      <Section title="Documentos de Identificação" icon={FileText}>
        <Field label="RG">
          <Input {...register('rg')} className="h-10 font-mono" />
        </Field>
        <Field label="Órgão emissor">
          <Input {...register('rgOrgaoEmissor')} className="h-10" placeholder="SSP" />
        </Field>
        <Field label="UF emissão">
          <Input {...register('rgUf')} className="h-10 uppercase" maxLength={2} />
        </Field>
        <Field label="Data emissão RG">
          <Input type="date" {...register('rgDataEmissao')} className="h-10" />
        </Field>
        <Field label="PIS / PASEP">
          <Input {...register('pisPasep')} className="h-10 font-mono" />
        </Field>
        <Field label="Título de eleitor">
          <Input {...register('tituloEleitor')} className="h-10 font-mono" />
        </Field>
        <Field label="CTPS nº">
          <Input {...register('numeroCtps')} className="h-10 font-mono" />
        </Field>
        <Field label="Série CTPS">
          <Input {...register('serieCtps')} className="h-10 font-mono" />
        </Field>
        <Field label="UF CTPS">
          <Input {...register('ufCtps')} className="h-10 uppercase" maxLength={2} />
        </Field>
        <Field label="Matrícula RPPS">
          <Input {...register('matriculaRpps')} className="h-10 font-mono" />
        </Field>
        <Field label="Matrícula INSS">
          <Input {...register('matriculaInss')} className="h-10 font-mono" />
        </Field>
      </Section>
    </div>
  )
}

function TabContato({ servidor }: { servidor: Servidor | null }) {
  if (!servidor) return null
  const contatos  = servidor.contatos?.filter(c => c.ativo) ?? []
  const enderecos = servidor.enderecos?.filter(e => e.ativo) ?? []

  return (
    <div className="space-y-6">
      <Section title="Contatos cadastrados" icon={Phone}>
        {contatos.length === 0 && (
          <p className="text-sm text-muted-foreground lg:col-span-3">Nenhum contato cadastrado.</p>
        )}
        {contatos.map(c => (
          <Field key={c.id} label={c.tipo}>
            <Input readOnly value={c.valor} className="h-10 bg-muted/40" />
          </Field>
        ))}
      </Section>
      <Section title="Endereços cadastrados" icon={MapPin}>
        {enderecos.length === 0 && (
          <p className="text-sm text-muted-foreground lg:col-span-3">Nenhum endereço cadastrado.</p>
        )}
        {enderecos.map(e => (
          <Field key={e.id} label={e.principal ? 'Endereço principal' : 'Endereço'} className="lg:col-span-3">
            <Input readOnly
              value={[e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep].filter(Boolean).join(', ')}
              className="h-10 bg-muted/40"
            />
          </Field>
        ))}
      </Section>
      <p className="text-xs text-muted-foreground">
        Para gerenciar contatos e endereços acesse o perfil do servidor.
      </p>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function EditarServidorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [servidor, setServidor]   = useState<Servidor | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('pessoal')

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const fetchServidor = useCallback(async () => {
    if (!id) return
    try {
      const { data } = await servidoresApi.obter(id)
      const s: Servidor = data.data
      setServidor(s)
      reset({
        nome:           s.nome,
        nomeSocial:     s.nomeSocial ?? '',
        dataNascimento: s.dataNascimento?.split('T')[0] ?? '',
        sexo:           s.sexo ?? undefined,
        estadoCivil:    s.estadoCivil ?? undefined,
        corRaca:        s.corRaca ?? undefined,
        naturalidade:   s.naturalidade ?? '',
        nacionalidade:  s.nacionalidade ?? 'BRASILEIRA',
        pne:            s.pne ?? false,
        tipoPne:        s.tipoPne ?? '',
        rg:             s.rg ?? '',
        rgOrgaoEmissor: s.rgOrgaoEmissor ?? '',
        rgUf:           s.rgUf ?? '',
        rgDataEmissao:  s.rgDataEmissao?.split('T')[0] ?? '',
        pisPasep:       s.pisPasep ?? '',
        tituloEleitor:  s.tituloEleitor ?? '',
        numeroCtps:     s.numeroCtps ?? '',
        serieCtps:      s.serieCtps ?? '',
        ufCtps:         s.ufCtps ?? '',
        matriculaRpps:  s.matriculaRpps ?? '',
        matriculaInss:  s.matriculaInss ?? '',
      })
    } catch {
      toast({ variant: 'destructive', title: 'Servidor não encontrado.' })
      navigate('/servidores')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, reset])

  useEffect(() => { fetchServidor() }, [fetchServidor])

  const onSubmit = async (data: FormData) => {
    if (!id) return
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '' && v != null)
      )
      await servidoresApi.atualizar(id, payload)
      toast({ title: 'Servidor atualizado com sucesso!' })
      navigate(`/servidores/${id}`)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl">
        <Skeleton className="h-10 w-48" />
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/servidores/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Editar Servidor</h1>
            {servidor && (
              <p className="text-sm text-muted-foreground">
                {servidor.nome} · <span className="font-mono">{servidor.matricula}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/servidores/${id}`)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="gov" onClick={handleSubmit(onSubmit)} disabled={saving} className="min-w-[140px]">
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              : <><Save className="w-4 h-4 mr-2" />Salvar alterações</>}
          </Button>
        </div>
      </div>

      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Existem alterações não salvas. Clique em "Salvar alterações" para confirmar.
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px shrink-0',
                activeTab === tabId
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {activeTab === 'pessoal'    && <TabPessoal register={register} setValue={setValue} watch={watch} errors={errors} />}
            {activeTab === 'documentos' && <TabDocumentos register={register} errors={errors} />}
            {activeTab === 'contato'    && <TabContato servidor={servidor} />}
          </form>
        </div>
      </div>
    </div>
  )
}
