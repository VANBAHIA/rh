import { useState, useEffect, useCallback } from 'react'
import { Briefcase, RefreshCw, Table2, List, ChevronRight, MapPin, Plus, Pencil, Trash2, Loader2, X, Layers, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cargosApi, comissionadosApi } from '@/services/modules'
import { formatCurrency, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'
import { REGIME_LABELS, TITULACAO_LABELS, type RegimeJuridico } from '@/types/servidor'

type Tab = 'cargos' | 'grupos' | 'tabela' | 'lotacoes'

const CLASSES_ESTATUTARIO = ['A', 'B', 'C', 'D', 'E']
const NIVEIS  = ['I', 'II', 'III', 'IV', 'V']

// ── Modal Grupo Ocupacional ────────────────────────────────────────────────

interface GrupoModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editando: any | null
}

function GrupoModal({ open, onClose, onSaved, editando }: GrupoModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ codigo: '', nome: '', descricao: '' })

  useEffect(() => {
    if (editando) {
      setForm({ codigo: editando.codigo ?? '', nome: editando.nome ?? '', descricao: editando.descricao ?? '' })
    } else {
      setForm({ codigo: '', nome: '', descricao: '' })
    }
  }, [editando, open])

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo.trim() || !form.nome.trim()) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha código e nome.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        codigo:    form.codigo.trim().toUpperCase(),
        nome:      form.nome.trim(),
        ...(form.descricao && { descricao: form.descricao.trim() }),
      }
      if (editando) {
        await cargosApi.atualizarGrupo(editando.id, payload)
        toast({ title: 'Grupo atualizado!' })
      } else {
        await cargosApi.criarGrupo(payload)
        toast({ title: 'Grupo criado!' })
      }
      onSaved()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar Grupo' : 'Novo Grupo Ocupacional'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Código <span className="text-destructive">*</span></Label>
              <Input value={form.codigo} onChange={field('codigo')} placeholder="Ex: TEC" className="h-10 uppercase font-mono" maxLength={10} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={field('nome')} placeholder="Ex: Técnico Administrativo" className="h-10" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={field('descricao')} placeholder="Opcional" className="h-10" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1.5" />Cancelar
            </Button>
            <Button type="submit" variant="gov" disabled={saving} className="min-w-[120px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Cargo ────────────────────────────────────────────────────────────

interface CargoModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  grupos: any[]
  editando: any | null
}

function CargoModal({ open, onClose, onSaved, grupos, editando }: CargoModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    codigo:              '',
    nome:                '',
    grupoOcupacionalId:  '',
    regimeJuridico:      '' as RegimeJuridico | '',
    escolaridadeMinima:  '',
    cargaHorariaSemanal: '40',
    cbo:                 '',
    descricao:           '',
    isComissionado:      false,
    simboloCC:           '',
    quantidadeVagas:     '0',
  })

  useEffect(() => {
    if (editando) {
      setForm({
        codigo:              editando.codigo              ?? '',
        nome:                editando.nome               ?? '',
        grupoOcupacionalId:  editando.grupoOcupacionalId ?? editando.grupoId ?? '',
        regimeJuridico:      editando.regimeJuridico      ?? '',
        escolaridadeMinima:  editando.escolaridadeMinima  ?? '',
        cargaHorariaSemanal: String(editando.cargaHorariaSemanal ?? editando.cargaHoraria ?? 40),
        cbo:                 editando.cbo                ?? '',
        descricao:           editando.descricao          ?? '',
        isComissionado:      editando.isComissionado     ?? false,
        simboloCC:           editando.simboloCC          ?? '',
        quantidadeVagas:     String(editando.quantidadeVagas ?? 0),
      })
    } else {
      setForm({
        codigo: '', nome: '', grupoOcupacionalId: '', regimeJuridico: '',
        escolaridadeMinima: '', cargaHorariaSemanal: '40', cbo: '',
        descricao: '', isComissionado: false, simboloCC: '', quantidadeVagas: '0',
      })
    }
  }, [editando, open])

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo.trim() || !form.nome.trim() || !form.grupoOcupacionalId || !form.regimeJuridico || !form.escolaridadeMinima) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha código, nome, grupo, regime e escolaridade.' })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        codigo:              form.codigo.trim().toUpperCase(),
        nome:                form.nome.trim(),
        grupoOcupacionalId:  form.grupoOcupacionalId,
        regimeJuridico:      form.regimeJuridico,
        escolaridadeMinima:  form.escolaridadeMinima,
        cargaHorariaSemanal: Number(form.cargaHorariaSemanal) || 40,
        quantidadeVagas:     Number(form.quantidadeVagas) || 0,
        isComissionado:      form.isComissionado,
        ...(form.cbo       && { cbo:       form.cbo.trim() }),
        ...(form.descricao && { descricao: form.descricao.trim() }),
        ...(form.isComissionado && form.simboloCC && { simboloCC: form.simboloCC.trim() }),
      }
      if (editando) {
        await cargosApi.atualizarCargo(editando.id, payload)
        toast({ title: 'Cargo atualizado!' })
      } else {
        await cargosApi.criarCargo(payload)
        toast({ title: 'Cargo criado!' })
      }
      onSaved()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">

            <div className="space-y-1.5">
              <Label>Código <span className="text-destructive">*</span></Label>
              <Input value={form.codigo} onChange={field('codigo')} placeholder="Ex: ANA-01" className="h-10 font-mono uppercase" maxLength={20} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={field('nome')} placeholder="Ex: Analista Administrativo" className="h-10" />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Grupo Ocupacional <span className="text-destructive">*</span></Label>
              <Select value={form.grupoOcupacionalId || 'none'} onValueChange={v => setForm(f => ({ ...f, grupoOcupacionalId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Selecione o grupo</SelectItem>
                  {grupos.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.codigo} — {g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Regime Jurídico <span className="text-destructive">*</span></Label>
              <Select value={form.regimeJuridico || 'none'} onValueChange={v => setForm(f => ({ ...f, regimeJuridico: v === 'none' ? '' : v as RegimeJuridico }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Selecione</SelectItem>
                  {Object.entries(REGIME_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Escolaridade Mínima <span className="text-destructive">*</span></Label>
              <Select value={form.escolaridadeMinima || 'none'} onValueChange={v => setForm(f => ({ ...f, escolaridadeMinima: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Selecione</SelectItem>
                  {Object.entries(TITULACAO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>C.H. Semanal (h)</Label>
              <Input type="number" min={1} max={60} value={form.cargaHorariaSemanal} onChange={field('cargaHorariaSemanal')} className="h-10" />
            </div>

            <div className="space-y-1.5">
              <Label>Qtd. de Vagas</Label>
              <Input type="number" min={0} value={form.quantidadeVagas} onChange={field('quantidadeVagas')} className="h-10" />
            </div>

            <div className="space-y-1.5">
              <Label>CBO</Label>
              <Input value={form.cbo} onChange={field('cbo')} placeholder="Ex: 2521-05" className="h-10 font-mono" maxLength={10} />
            </div>

            <div className="col-span-2 flex items-center gap-3 py-1">
              <input
                type="checkbox"
                id="isComissionado"
                checked={form.isComissionado}
                onChange={e => setForm(f => ({ ...f, isComissionado: e.target.checked, simboloCC: e.target.checked ? f.simboloCC : '' }))}
                className="w-4 h-4 rounded border-border accent-gov-600"
              />
              <label htmlFor="isComissionado" className="text-sm font-medium cursor-pointer">Cargo comissionado (CC)</label>
              {form.isComissionado && (
                <Input value={form.simboloCC} onChange={field('simboloCC')} placeholder="Ex: CC-3" className="h-8 w-28 font-mono text-xs" maxLength={10} />
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={field('descricao')} placeholder="Opcional" className="h-10" />
            </div>

          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1.5" />Cancelar
            </Button>
            <Button type="submit" variant="gov" disabled={saving} className="min-w-[120px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Lotação ──────────────────────────────────────────────────────────

interface LotacaoModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  lotacoes: any[]
  editando: any | null
}

function LotacaoModal({ open, onClose, onSaved, lotacoes, editando }: LotacaoModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', sigla: '', codigo: '', lotacaoPaiId: '', descricao: '' })

  useEffect(() => {
    if (editando) {
      setForm({
        nome:         editando.nome         ?? '',
        sigla:        editando.sigla        ?? '',
        codigo:       editando.codigo       ?? '',
        lotacaoPaiId: editando.lotacaoPaiId ?? '',
        descricao:    editando.descricao    ?? '',
      })
    } else {
      setForm({ nome: '', sigla: '', codigo: '', lotacaoPaiId: '', descricao: '' })
    }
  }, [editando, open])

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || !form.sigla.trim() || !form.codigo.trim()) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha nome, sigla e código.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        nome:   form.nome.trim(),
        sigla:  form.sigla.trim().toUpperCase(),
        codigo: form.codigo.trim(),
        ...(form.lotacaoPaiId && { lotacaoPaiId: form.lotacaoPaiId }),
        ...(form.descricao    && { descricao: form.descricao.trim() }),
      }
      if (editando) {
        await cargosApi.atualizarLotacao(editando.id, payload)
        toast({ title: 'Lotação atualizada!' })
      } else {
        await cargosApi.criarLotacao(payload)
        toast({ title: 'Lotação criada!' })
      }
      onSaved()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  const pais = lotacoes.filter(l => !editando || l.id !== editando.id)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar Lotação' : 'Nova Lotação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={field('nome')} placeholder="Ex: Secretaria de Administração" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Sigla <span className="text-destructive">*</span></Label>
              <Input value={form.sigla} onChange={field('sigla')} placeholder="Ex: SEMAD" className="h-10 uppercase" maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>Código <span className="text-destructive">*</span></Label>
              <Input value={form.codigo} onChange={field('codigo')} placeholder="Ex: 001" className="h-10 font-mono" maxLength={20} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Lotação pai</Label>
              <Select
                value={form.lotacaoPaiId || 'nenhum'}
                onValueChange={v => setForm(f => ({ ...f, lotacaoPaiId: v === 'nenhum' ? '' : v }))}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhuma (raiz)</SelectItem>
                  {pais.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.sigla} — {l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1.5" />Cancelar
            </Button>
            <Button type="submit" variant="gov" disabled={saving} className="min-w-[120px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Tabela Salarial ──────────────────────────────────────────────────

interface TabelaModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editando: any | null
}

function TabelaModal({ open, onClose, onSaved, editando }: TabelaModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', vigenciaIni: '', descricao: '', regime: 'ESTATUTARIO' })

  useEffect(() => {
    if (editando) {
      setForm({
        nome:        editando.nome        ?? '',
        vigenciaIni: editando.vigenciaIni ? editando.vigenciaIni.split('T')[0] : editando.vigencia ?? '',
        descricao:   editando.descricao   ?? '',
        regime:      editando.regime      ?? 'ESTATUTARIO',
      })
    } else {
      const hoje = new Date().toISOString().split('T')[0]
      setForm({ nome: '', vigenciaIni: hoje, descricao: '', regime: 'ESTATUTARIO' })
    }
  }, [editando, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || !form.vigenciaIni) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha nome e vigência.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        nome:        form.nome.trim(),
        vigenciaIni: form.vigenciaIni,
        regime:      form.regime,
        ...(form.descricao && { descricao: form.descricao.trim() }),
      }
      if (editando) {
        await cargosApi.atualizarTabela(editando.id, payload)
        toast({ title: 'Tabela atualizada!' })
      } else {
        await cargosApi.criarTabela(payload)
        toast({ title: 'Tabela criada!' })
      }
      onSaved()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar Tabela' : 'Nova Tabela Salarial'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Tabela 2024" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Regime <span className="text-destructive">*</span></Label>
              <Select value={form.regime} onValueChange={v => setForm(f => ({ ...f, regime: v }))} disabled={!!editando}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESTATUTARIO">Estatutário (classes A–E fixas)</SelectItem>
                  <SelectItem value="CELETISTA">CLT / Celetista (classes livres)</SelectItem>
                  <SelectItem value="COMISSIONADO">Comissionado (símbolos CC livres)</SelectItem>
                  <SelectItem value="ESTAGIARIO">Estagiário (classes livres)</SelectItem>
                  <SelectItem value="TEMPORARIO">Temporário (classes livres)</SelectItem>
                  <SelectItem value="AGENTE_POLITICO">Agente Político (classes livres)</SelectItem>
                </SelectContent>
              </Select>
              {editando && <p className="text-xs text-muted-foreground">O regime não pode ser alterado após a criação.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Vigência a partir de <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.vigenciaIni} onChange={e => setForm(f => ({ ...f, vigenciaIni: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" className="h-10" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1.5" />Cancelar
            </Button>
            <Button type="submit" variant="gov" disabled={saving} className="min-w-[120px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Nível Salarial (PCCV) ────────────────────────────────────────────

interface NivelSalarialModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  tabelaId: string
  tabelaRegime: string
  editando: any | null
}

function NivelSalarialModal({ open, onClose, onSaved, tabelaId, tabelaRegime, editando }: NivelSalarialModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nivel: '', classe: '', vencimentoBase: '' })
  const isLivre = tabelaRegime !== 'ESTATUTARIO'

  const classeLabel = tabelaRegime === 'COMISSIONADO' ? 'Símbolo CC'
    : tabelaRegime === 'CELETISTA'       ? 'Referência / Nível'
    : tabelaRegime === 'ESTAGIARIO'      ? 'Faixa'
    : tabelaRegime === 'TEMPORARIO'      ? 'Categoria'
    : tabelaRegime === 'AGENTE_POLITICO' ? 'Cargo / Símbolo'
    : 'Classe'

  const classePlaceholder = tabelaRegime === 'COMISSIONADO' ? 'CC-1, CCN, CCNS-E…'
    : tabelaRegime === 'CELETISTA'       ? 'B-1, B-2…'
    : tabelaRegime === 'ESTAGIARIO'      ? 'Júnior, Pleno…'
    : tabelaRegime === 'TEMPORARIO'      ? 'T-1, T-2…'
    : tabelaRegime === 'AGENTE_POLITICO' ? 'SEC, VER…'
    : 'A, B, C…'

  useEffect(() => {
    if (editando) {
      setForm({
        nivel:          editando.nivel          ?? '',
        classe:         editando.classe         ?? '',
        vencimentoBase: editando.vencimentoBase != null ? String(editando.vencimentoBase) : '',
      })
    } else {
      setForm({ nivel: '', classe: '', vencimentoBase: '' })
    }
  }, [editando, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nivel || !form.classe || !form.vencimentoBase) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha nível, símbolo/classe e vencimento.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        nivel:          form.nivel.toUpperCase(),
        classe:         form.classe.toUpperCase(),
        vencimentoBase: parseFloat(form.vencimentoBase),
      }
      if (editando) {
        await cargosApi.atualizarNivelTabela(tabelaId, editando.id, payload)
        toast({ title: 'Nível atualizado!' })
      } else {
        await cargosApi.criarNivelTabela(tabelaId, payload)
        toast({ title: 'Nível criado!' })
      }
      onSaved()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar Nível' : 'Novo Nível Salarial'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nível <span className="text-destructive">*</span></Label>
              <Select value={form.nivel || 'none'} onValueChange={v => setForm(f => ({ ...f, nivel: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Selecione</SelectItem>
                  {NIVEIS.map(n => <SelectItem key={n} value={n}>Nível {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{classeLabel} <span className="text-destructive">*</span></Label>
              {isLivre ? (
                <Input
                  value={form.classe}
                  onChange={e => setForm(f => ({ ...f, classe: e.target.value }))}
                  placeholder={classePlaceholder}
                  className="h-10 font-mono uppercase"
                  maxLength={20}
                />
              ) : (
                <Select value={form.classe || 'none'} onValueChange={v => setForm(f => ({ ...f, classe: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Selecione</SelectItem>
                    {CLASSES_ESTATUTARIO.map(c => <SelectItem key={c} value={c}>Classe {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Vencimento Base (R$) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" min={0} value={form.vencimentoBase}
                onChange={e => setForm(f => ({ ...f, vencimentoBase: e.target.value }))}
                placeholder="Ex: 3500.00" className="h-10 font-mono" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1.5" />Cancelar
            </Button>
            <Button type="submit" variant="gov" disabled={saving} className="min-w-[120px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Nível Comissionado (CC) ──────────────────────────────────────────

interface NivelCCModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editando: any | null
}

function NivelCCModal({ open, onClose, onSaved, editando }: NivelCCModalProps) {
  const [saving, setSaving] = useState(false)
  const hoje = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ simbolo: '', denominacao: '', vencimento: '', vigenciaIni: hoje })

  useEffect(() => {
    if (editando) {
      setForm({
        simbolo:     editando.simbolo     ?? '',
        denominacao: editando.denominacao ?? '',
        vencimento:  editando.vencimento  != null ? String(editando.vencimento) : '',
        vigenciaIni: editando.vigenciaIni ? editando.vigenciaIni.split('T')[0] : hoje,
      })
    } else {
      setForm({ simbolo: '', denominacao: '', vencimento: '', vigenciaIni: hoje })
    }
  }, [editando, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.simbolo || !form.denominacao || !form.vencimento) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha símbolo, denominação e vencimento.' })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, vencimento: parseFloat(form.vencimento) }
      if (editando) {
        await comissionadosApi.atualizarNivel(editando.id, payload)
        toast({ title: 'Símbolo atualizado!' })
      } else {
        await comissionadosApi.criarNivel(payload)
        toast({ title: 'Símbolo criado!' })
      }
      onSaved()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar Símbolo CC' : 'Novo Símbolo CC'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Símbolo <span className="text-destructive">*</span></Label>
              <Input value={form.simbolo} onChange={e => setForm(f => ({ ...f, simbolo: e.target.value }))} placeholder="CCNS-E, CC-1…" className="h-10 font-mono" maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <Label>Denominação <span className="text-destructive">*</span></Label>
              <Input value={form.denominacao} onChange={e => setForm(f => ({ ...f, denominacao: e.target.value }))} placeholder="Cargo Comissionado Nível Superior…" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento (R$) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" min={0} value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} placeholder="Ex: 3500.00" className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Vigência a partir de <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.vigenciaIni} onChange={e => setForm(f => ({ ...f, vigenciaIni: e.target.value }))} className="h-10" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1.5" />Cancelar
            </Button>
            <Button type="submit" variant="gov" disabled={saving} className="min-w-[120px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Gratificação de Função (GF) ──────────────────────────────────────

interface GFModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editando: any | null
}

function GFModal({ open, onClose, onSaved, editando }: GFModalProps) {
  const [saving, setSaving] = useState(false)
  const hoje = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ simbolo: '', descricao: '', percentual: '', vigenciaIni: hoje })

  useEffect(() => {
    if (editando) {
      setForm({
        simbolo:     editando.simbolo     ?? '',
        descricao:   editando.descricao   ?? '',
        percentual:  editando.percentual  != null ? String(editando.percentual) : '',
        vigenciaIni: editando.vigenciaIni ? editando.vigenciaIni.split('T')[0] : hoje,
      })
    } else {
      setForm({ simbolo: '', descricao: '', percentual: '', vigenciaIni: hoje })
    }
  }, [editando, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.simbolo || !form.percentual) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha símbolo e percentual.' })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, percentual: parseFloat(form.percentual) }
      if (editando) {
        await comissionadosApi.atualizarGratificacao(editando.id, payload)
        toast({ title: 'GF atualizada!' })
      } else {
        await comissionadosApi.criarGratificacao(payload)
        toast({ title: 'GF criada!' })
      }
      onSaved()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar GF' : 'Nova Gratificação de Função'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Símbolo <span className="text-destructive">*</span></Label>
              <Input value={form.simbolo} onChange={e => setForm(f => ({ ...f, simbolo: e.target.value }))} placeholder="GF-1, GF-2…" className="h-10 font-mono" maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Gratificação de Chefia de Gabinete" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Percentual (%) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" min={0} value={form.percentual} onChange={e => setForm(f => ({ ...f, percentual: e.target.value }))} placeholder="Ex: 50.00" className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Vigência a partir de <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.vigenciaIni} onChange={e => setForm(f => ({ ...f, vigenciaIni: e.target.value }))} className="h-10" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1.5" />Cancelar
            </Button>
            <Button type="submit" variant="gov" disabled={saving} className="min-w-[120px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function CargosPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cargos')

  const [cargos, setCargos]                     = useState<any[]>([])
  const [loadingCargos, setLoadingCargos]       = useState(true)
  const [searchCargo, setSearchCargo]           = useState('')
  const [cargoModal, setCargoModal]             = useState(false)
  const [editandoCargo, setEditandoCargo]       = useState<any | null>(null)
  const [desativandoCargo, setDesativandoCargo] = useState<string | null>(null)

  const [grupos, setGrupos]                     = useState<any[]>([])
  const [loadingGrupos, setLoadingGrupos]       = useState(false)
  const [grupoModal, setGrupoModal]             = useState(false)
  const [editandoGrupo, setEditandoGrupo]       = useState<any | null>(null)
  const [desativandoGrupo, setDesativandoGrupo] = useState<string | null>(null)

  const [tabelas, setTabelas]                   = useState<any[]>([])
  const [tabelaSel, setTabelaSel]               = useState<any | null>(null)
  const [matriz, setMatriz]                     = useState<any[]>([])
  const [loadingMatriz, setLoadingMatriz]       = useState(false)
  const [tabelaModal, setTabelaModal]           = useState(false)
  const [editandoTabela, setEditandoTabela]     = useState<any | null>(null)
  const [nivelSalarialModal, setNivelSalarialModal] = useState(false)
  const [editandoNivelSalarial, setEditandoNivelSalarial] = useState<any | null>(null)
  const [removendoNivel, setRemovendoNivel]     = useState<string | null>(null)

  const [gfs, setGfs]                           = useState<any[]>([])
  const [loadingGFs, setLoadingGFs]             = useState(false)
  const [gfModal, setGfModal]                   = useState(false)
  const [editandoGF, setEditandoGF]             = useState<any | null>(null)

  const [lotacoes, setLotacoes]                     = useState<any[]>([])
  const [loadingLotacoes, setLoadingLotacoes]       = useState(false)
  const [searchLotacao, setSearchLotacao]           = useState('')
  const [lotacaoModal, setLotacaoModal]             = useState(false)
  const [editandoLotacao, setEditandoLotacao]       = useState<any | null>(null)
  const [desativandoLotacao, setDesativandoLotacao] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchCargos = useCallback(async () => {
    setLoadingCargos(true)
    try {
      const [cRes, tRes, gRes] = await Promise.all([
        cargosApi.listar(),
        cargosApi.tabelas(),
        cargosApi.grupos(),
      ])
      setCargos((cRes.data as any).data ?? [])
      const tabs = (tRes.data as any).data ?? []
      setTabelas(tabs)
      if (tabs.length > 0 && !tabelaSel) setTabelaSel(tabs[0])
      setGrupos((gRes.data as any).data ?? (gRes.data as any) ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setLoadingCargos(false)
    }
  }, [])

  const fetchTabelas = useCallback(async () => {
    try {
      const res = await cargosApi.tabelas()
      const tabs = (res.data as any).data ?? []
      setTabelas(tabs)
      if (tabs.length > 0) setTabelaSel((prev: any) => prev ?? tabs[0])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    }
  }, [])

  const fetchGrupos = useCallback(async () => {
    setLoadingGrupos(true)
    try {
      const res = await cargosApi.grupos()
      setGrupos((res.data as any).data ?? (res.data as any) ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setLoadingGrupos(false)
    }
  }, [])

  const fetchLotacoes = useCallback(async () => {
    setLoadingLotacoes(true)
    try {
      const res = await cargosApi.lotacoes()
      setLotacoes((res.data as any).data ?? res.data ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setLoadingLotacoes(false)
    }
  }, [])

  const fetchGFs = useCallback(async () => {
    setLoadingGFs(true)
    try {
      const res = await comissionadosApi.gratificacoes({ ativo: '' })
      setGfs(res.data?.data ?? res.data ?? [])
    } catch { }
    finally { setLoadingGFs(false) }
  }, [])

  useEffect(() => { fetchCargos() }, [fetchCargos])

  useEffect(() => {
    if (activeTab === 'grupos')   fetchGrupos()
    if (activeTab === 'lotacoes') fetchLotacoes()
    if (activeTab === 'tabela')   fetchGFs()
  }, [activeTab, fetchGrupos, fetchLotacoes, fetchGFs])

  // ── Helpers ────────────────────────────────────────────────────────────

  const parseMatrizPayload = (payload: any): any[] => {
    const inner = payload?.data ?? payload
    if (Array.isArray(inner)) return inner
    const matrizObj = inner?.matriz
    if (matrizObj && typeof matrizObj === 'object') {
      const rows: any[] = []
      for (const [nivel, classes] of Object.entries(matrizObj as Record<string, Record<string, any>>)) {
        for (const [classe, cel] of Object.entries(classes)) {
          if (cel) rows.push({ ...cel, nivel, classe })
        }
      }
      return rows
    }
    return []
  }

  useEffect(() => {
    if (!tabelaSel) return
    setLoadingMatriz(true)
    cargosApi.matriz(tabelaSel.id)
      .then(r => setMatriz(parseMatrizPayload(r.data)))
      .catch(() => setMatriz([]))
      .finally(() => setLoadingMatriz(false))
  }, [tabelaSel])

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleDesativarCargo = async (id: string) => {
    if (!confirm('Desativar este cargo?')) return
    setDesativandoCargo(id)
    try {
      await cargosApi.desativarCargo(id)
      toast({ title: 'Cargo desativado.' })
      fetchCargos()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setDesativandoCargo(null)
    }
  }

  const handleDesativarGrupo = async (id: string) => {
    if (!confirm('Desativar este grupo ocupacional?')) return
    setDesativandoGrupo(id)
    try {
      await cargosApi.desativarGrupo(id)
      toast({ title: 'Grupo desativado.' })
      fetchGrupos()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setDesativandoGrupo(null)
    }
  }

  const handleDesativarLotacao = async (id: string) => {
    if (!confirm('Desativar esta lotação?')) return
    setDesativandoLotacao(id)
    try {
      await cargosApi.desativarLotacao(id)
      toast({ title: 'Lotação desativada.' })
      fetchLotacoes()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setDesativandoLotacao(null)
    }
  }

  const recarregarMatriz = async () => {
    if (!tabelaSel) return
    const r = await cargosApi.matriz(tabelaSel.id)
    setMatriz(parseMatrizPayload(r.data))
  }

  const handleRemoverNivelSalarial = async (id: string) => {
    if (!tabelaSel) return
    if (!confirm('Remover este nível salarial?')) return
    setRemovendoNivel(id)
    try {
      await cargosApi.removerNivelTabela(tabelaSel.id, id)
      toast({ title: 'Nível removido.' })
      await recarregarMatriz()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setRemovendoNivel(null)
    }
  }

  const handleDesativarGF = async (id: string) => {
    if (!confirm('Desativar esta GF?')) return
    try {
      await comissionadosApi.desativarGratificacao(id)
      toast({ title: 'GF desativada.' })
      fetchGFs()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    }
  }

  // ── Filtros ────────────────────────────────────────────────────────────

  const cargosFiltrados = cargos.filter(c => {
    if (!searchCargo) return true
    const q = searchCargo.toLowerCase()
    return (
      c.nome.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q) ||
      (c.grupoOcupacional?.nome ?? '').toLowerCase().includes(q)
    )
  })

  const lotacoesFiltradas = lotacoes.filter(l => {
    if (!searchLotacao) return true
    const q = searchLotacao.toLowerCase()
    return (
      l.nome.toLowerCase().includes(q) ||
      l.sigla.toLowerCase().includes(q) ||
      (l.codigo ?? '').toLowerCase().includes(q)
    )
  })

  // ── Matriz dinâmica ────────────────────────────────────────────────────

  const tabRegime: string = tabelaSel?.regime ?? 'ESTATUTARIO'
  const isTabLivre = tabRegime !== 'ESTATUTARIO'

  const REGIME_BADGE: Record<string, { label: string; cls: string }> = {
    ESTATUTARIO:    { label: 'Estatutário — Classes A–E',           cls: 'bg-blue-100 text-blue-700 border border-blue-200'     },
    CELETISTA:      { label: 'CLT / Celetista — Classes livres',    cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    COMISSIONADO:   { label: 'Comissionado — Símbolos CC livres',   cls: 'bg-purple-100 text-purple-700 border border-purple-200'  },
    ESTAGIARIO:     { label: 'Estagiário — Faixas livres',          cls: 'bg-orange-100 text-orange-700 border border-orange-200'  },
    TEMPORARIO:     { label: 'Temporário — Categorias livres',      cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200'  },
    AGENTE_POLITICO:{ label: 'Agente Político — Símbolos livres',   cls: 'bg-rose-100 text-rose-700 border border-rose-200'       },
  }

  const CLASSE_COL_HEADER: Record<string, string> = {
    ESTATUTARIO:    'Classe',
    CELETISTA:      'Referência',
    COMISSIONADO:   'Símbolo',
    ESTAGIARIO:     'Faixa',
    TEMPORARIO:     'Categoria',
    AGENTE_POLITICO:'Símbolo',
  }

  const mapaMatriz: Record<string, number> = {};
  (Array.isArray(matriz) ? matriz : []).forEach((item: any) => {
    mapaMatriz[`${item.nivel}-${item.classe}`] = item.valor ?? item.vencimentoBase
  })

  const niveisMatrizList: any[] = Array.isArray(matriz) ? matriz : []

  const classesMatriz: string[] = isTabLivre
    ? Array.from(new Set(niveisMatrizList.map((i: any) => i.classe))).sort()
    : CLASSES_ESTATUTARIO

  const isLoading = loadingCargos || loadingGrupos || loadingLotacoes

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cargos & PCCV</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Plano de Cargos, Carreiras e Vencimentos</p>
        </div>
        <Button variant="outline" size="sm"
          onClick={() => {
            if (activeTab === 'lotacoes')    fetchLotacoes()
            else if (activeTab === 'grupos') fetchGrupos()
            else if (activeTab === 'tabela') { fetchTabelas(); fetchGFs() }
            else fetchCargos()
          }}
          disabled={isLoading}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />Atualizar
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {([
            { id: 'cargos',   label: 'Cargos',              icon: List   },
            { id: 'grupos',   label: 'Grupos Ocupacionais', icon: Layers },
            { id: 'tabela',   label: 'Vencimentos',         icon: Table2 },
            { id: 'lotacoes', label: 'Lotações',            icon: MapPin },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
                activeTab === id
                  ? 'border-gov-600 text-gov-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── Aba Cargos ── */}
          {activeTab === 'cargos' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  placeholder="Buscar por nome, código ou grupo..."
                  value={searchCargo}
                  onChange={e => setSearchCargo(e.target.value)}
                  className="h-9 text-sm max-w-xs"
                />
                <Button variant="gov" size="sm" className="ml-auto"
                  onClick={() => { setEditandoCargo(null); setCargoModal(true) }}>
                  <Plus className="w-4 h-4 mr-1.5" />Novo Cargo
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Código', 'Cargo', 'Grupo', 'Regime', 'Escolaridade', 'C.H.', 'Vagas', 'Servidores', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCargos ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                      </tr>
                    )) : cargosFiltrados.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-16 text-muted-foreground">
                        <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Nenhum cargo encontrado.</p>
                      </td></tr>
                    ) : cargosFiltrados.map((c: any) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gov-600 font-semibold">{c.codigo}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {c.nome}
                          {c.isComissionado && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">
                              {c.simboloCC ?? 'CC'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {c.grupoOcupacional?.nome ?? c.grupo?.nome ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {REGIME_LABELS[c.regimeJuridico as RegimeJuridico] ?? c.regimeJuridico ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {TITULACAO_LABELS[c.escolaridadeMinima] ?? c.escolaridadeMinima ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {(c.cargaHorariaSemanal ?? c.cargaHoraria) ? `${c.cargaHorariaSemanal ?? c.cargaHoraria}h` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                          {c.quantidadeVagas ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded-full bg-gov-100 text-gov-700 text-xs font-semibold">
                            {c.totalServidores ?? c._count?.servidores ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setEditandoCargo(c); setCargoModal(true) }}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            {c.ativo !== false && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                                disabled={desativandoCargo === c.id}
                                onClick={() => handleDesativarCargo(c.id)}>
                                {desativandoCargo === c.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Aba Grupos Ocupacionais ── */}
          {activeTab === 'grupos' && (
            <div className="space-y-4">
              <div className="flex items-center">
                <Button variant="gov" size="sm" className="ml-auto"
                  onClick={() => { setEditandoGrupo(null); setGrupoModal(true) }}>
                  <Plus className="w-4 h-4 mr-1.5" />Novo Grupo
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Código', 'Nome', 'Descrição', 'Cargos', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingGrupos ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                      </tr>
                    )) : grupos.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-16 text-muted-foreground">
                        <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Nenhum grupo cadastrado.</p>
                      </td></tr>
                    ) : grupos.map((g: any) => (
                      <tr key={g.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gov-600 font-semibold">{g.codigo}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{g.nome}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{g.descricao ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded-full bg-gov-100 text-gov-700 text-xs font-semibold">
                            {g.totalCargos ?? g._count?.cargos ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            g.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          )}>
                            {g.ativo !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setEditandoGrupo(g); setGrupoModal(true) }}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            {g.ativo !== false && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                                disabled={desativandoGrupo === g.id}
                                onClick={() => handleDesativarGrupo(g.id)}>
                                {desativandoGrupo === g.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Aba Vencimentos ── */}
          {activeTab === 'tabela' && (
            <div className="space-y-4">

              {/* Seletor de tabela + ações */}
              <div className="flex items-center gap-3 flex-wrap">
                {tabelas.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {tabelas.map((t: any) => (
                      <button key={t.id} onClick={() => setTabelaSel(t)}
                        className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                          tabelaSel?.id === t.id
                            ? 'bg-gov-700 text-white border-gov-700'
                            : 'border-border text-muted-foreground hover:border-gov-300'
                        )}>
                        {t.nome}
                        {t.regime && t.regime !== 'ESTATUTARIO' && (
                          <span className="ml-1.5 text-xs opacity-70 font-mono">
                            {t.regime === 'COMISSIONADO' ? 'CC'
                              : t.regime === 'CELETISTA' ? 'CLT'
                              : t.regime === 'ESTAGIARIO' ? 'EST'
                              : t.regime === 'TEMPORARIO' ? 'TMP'
                              : t.regime === 'AGENTE_POLITICO' ? 'AP'
                              : t.regime}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 ml-auto">
                  {tabelaSel && (
                    <>
                      <Button variant="outline" size="sm"
                        onClick={() => { setEditandoTabela(tabelaSel); setTabelaModal(true) }}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />Editar Tabela
                      </Button>
                      <Button variant="outline" size="sm"
                        onClick={() => { setEditandoNivelSalarial(null); setNivelSalarialModal(true) }}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {isTabLivre ? 'Adicionar Símbolo/Nível' : 'Adicionar Nível'}
                      </Button>
                    </>
                  )}
                  <Button variant="gov" size="sm"
                    onClick={() => { setEditandoTabela(null); setTabelaModal(true) }}>
                    <Plus className="w-4 h-4 mr-1.5" />Nova Tabela
                  </Button>
                </div>
              </div>

              {/* Badge de regime da tabela */}
              {tabelaSel && (
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
                    REGIME_BADGE[tabRegime]?.cls ?? 'bg-muted text-muted-foreground border border-border'
                  )}>
                    {REGIME_BADGE[tabRegime]?.label ?? tabRegime}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Vigência: {tabelaSel.vigencia ?? tabelaSel.vigenciaIni}
                  </span>
                </div>
              )}

              {/* Legenda de níveis (somente estatutário) */}
              {!isTabLivre && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {[
                    { nivel: 'I',   desc: 'Médio Normal'       },
                    { nivel: 'II',  desc: 'Licenciatura'       },
                    { nivel: 'III', desc: 'Pós-Graduação Lato' },
                    { nivel: 'IV',  desc: 'Mestrado'           },
                    { nivel: 'V',   desc: 'Doutorado'          },
                  ].map(({ nivel, desc }) => (
                    <div key={nivel} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                      <span className="w-7 h-7 rounded-full bg-gov-700 text-white flex items-center justify-center text-xs font-bold shrink-0">{nivel}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Matriz */}
              {loadingMatriz ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !tabelaSel ? (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Table2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Crie ou selecione uma tabela salarial.</p>
                </div>
              ) : classesMatriz.length === 0 && !isTabLivre ? (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Table2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhum nível cadastrado. Clique em "Adicionar Nível".</p>
                </div>
              ) : isTabLivre && classesMatriz.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Table2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhum símbolo cadastrado. Clique em "Adicionar Símbolo/Nível".</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#0f1629] text-white">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          {CLASSE_COL_HEADER[tabRegime] ?? 'Classe'} \ Nível
                        </th>
                        {NIVEIS.map(n => (
                          <th key={n} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Nível {n}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classesMatriz.map((cl, ci) => (
                        <tr key={cl} className={cn('border-b border-border', ci % 2 === 0 ? 'bg-white' : 'bg-muted/20')}>
                          <td className="px-4 py-3 font-bold text-foreground">
                            <span className={cn(
                              'w-7 h-7 inline-flex items-center justify-center rounded-full text-xs font-bold mr-2',
                              isTabLivre ? 'bg-purple-100 text-purple-700' : 'bg-gov-100 text-gov-700'
                            )}>{cl.charAt(0)}</span>
                            {isTabLivre ? cl : `Classe ${cl}`}
                          </td>
                          {NIVEIS.map(nv => {
                            const val = mapaMatriz[`${nv}-${cl}`]
                            const nivelItem = niveisMatrizList.find((item: any) => item.nivel === nv && item.classe === cl)
                            return (
                              <td key={nv} className="px-4 py-3 text-center group relative">
                                {val != null ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(val)}</span>
                                    {nivelItem && tabelaSel && (
                                      <div className="hidden group-hover:flex items-center gap-0.5">
                                        <button
                                          className="p-0.5 rounded hover:bg-muted transition-colors"
                                          onClick={() => { setEditandoNivelSalarial(nivelItem); setNivelSalarialModal(true) }}
                                          title="Editar"
                                        >
                                          <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                                        </button>
                                        <button
                                          className="p-0.5 rounded hover:bg-destructive/10 transition-colors"
                                          disabled={removendoNivel === nivelItem.id}
                                          onClick={() => handleRemoverNivelSalarial(nivelItem.id)}
                                          title="Remover"
                                        >
                                          {removendoNivel === nivelItem.id
                                            ? <Loader2 className="w-2.5 h-2.5 animate-spin text-destructive" />
                                            : <Trash2 className="w-2.5 h-2.5 text-destructive" />}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/60 text-xs font-mono">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Gratificações de Função */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Gratificações de Função (GF)</h3>
                    <p className="text-xs text-muted-foreground">Percentual adicional sobre o vencimento base</p>
                  </div>
                  <Button variant="outline" size="sm"
                    onClick={() => { setEditandoGF(null); setGfModal(true) }}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Nova GF
                  </Button>
                </div>
                {loadingGFs ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : gfs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                    <Star className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Nenhuma GF cadastrada.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {['Símbolo', 'Descrição', 'Percentual (%)', 'Vigência', 'Status', ''].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gfs.map((g: any) => (
                          <tr key={g.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600">{g.simbolo}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{g.descricao ?? '—'}</td>
                            <td className="px-4 py-3 font-mono text-sm font-semibold text-amber-600">{Number(g.percentual).toFixed(2)}%</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {new Date(g.vigenciaIni).toLocaleDateString('pt-BR')}
                              {g.vigenciaFim ? ` → ${new Date(g.vigenciaFim).toLocaleDateString('pt-BR')}` : ' → vigente'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                g.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                              )}>
                                {g.ativo !== false ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => { setEditandoGF(g); setGfModal(true) }}>
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                                {g.ativo !== false && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                                    onClick={() => handleDesativarGF(g.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Aba Lotações ── */}
          {activeTab === 'lotacoes' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  placeholder="Buscar por nome, sigla ou código..."
                  value={searchLotacao}
                  onChange={e => setSearchLotacao(e.target.value)}
                  className="h-9 text-sm max-w-xs"
                />
                <Button variant="gov" size="sm" className="ml-auto"
                  onClick={() => { setEditandoLotacao(null); setLotacaoModal(true) }}>
                  <Plus className="w-4 h-4 mr-1.5" />Nova Lotação
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Código', 'Sigla', 'Nome', 'Lotação Pai', 'Nível', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLotacoes ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                      </tr>
                    )) : lotacoesFiltradas.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">
                        <MapPin className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Nenhuma lotação encontrada.</p>
                      </td></tr>
                    ) : lotacoesFiltradas.map((l: any) => (
                      <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gov-600 font-semibold">{l.codigo ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gov-100 text-gov-700 text-xs font-semibold font-mono">{l.sigla}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{l.nome}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {l.lotacaoPai
                            ? `${l.lotacaoPai.sigla} — ${l.lotacaoPai.nome}`
                            : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-muted-foreground">{l.nivel ?? 1}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            l.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          )}>
                            {l.ativo !== false ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setEditandoLotacao(l); setLotacaoModal(true) }}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            {l.ativo !== false && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                                disabled={desativandoLotacao === l.id}
                                onClick={() => handleDesativarLotacao(l.id)}>
                                {desativandoLotacao === l.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      <CargoModal
        open={cargoModal}
        onClose={() => setCargoModal(false)}
        onSaved={fetchCargos}
        grupos={grupos}
        editando={editandoCargo}
      />
      <GrupoModal
        open={grupoModal}
        onClose={() => setGrupoModal(false)}
        onSaved={fetchGrupos}
        editando={editandoGrupo}
      />
      <LotacaoModal
        open={lotacaoModal}
        onClose={() => setLotacaoModal(false)}
        onSaved={fetchLotacoes}
        lotacoes={lotacoes}
        editando={editandoLotacao}
      />
      <TabelaModal
        open={tabelaModal}
        onClose={() => setTabelaModal(false)}
        onSaved={fetchTabelas}
        editando={editandoTabela}
      />
      {tabelaSel && (
        <NivelSalarialModal
          open={nivelSalarialModal}
          onClose={() => setNivelSalarialModal(false)}
          onSaved={recarregarMatriz}
          tabelaId={tabelaSel.id}
          tabelaRegime={tabelaSel.regime ?? 'ESTATUTARIO'}
          editando={editandoNivelSalarial}
        />
      )}
      <GFModal
        open={gfModal}
        onClose={() => setGfModal(false)}
        onSaved={fetchGFs}
        editando={editandoGF}
      />
    </div>
  )
}
