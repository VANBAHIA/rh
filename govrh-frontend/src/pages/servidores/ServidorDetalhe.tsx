import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit, Plus, Trash2, Star, Phone, Mail, MapPin,
  Briefcase, User, Loader2, Check, X, Save, ChevronDown, AlertTriangle,
} from 'lucide-react'
import { servidoresApi } from '@/services/servidores'
import { cargosApi } from '@/services/modules'
import { extractApiError } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { formatCPF, formatDate, formatCurrency } from '@/lib/utils'

// ── TIPOS ────────────────────────────────────────────────────────────────────

interface Contato { id: string; tipo: string; valor: string; principal: boolean; ativo: boolean }
interface Endereco { id: string; cep?: string; logradouro: string; numero: string; complemento?: string; bairro: string; municipio: string; uf: string; principal: boolean; ativo: boolean }
interface VinculoFuncional {
  id: string; regimeJuridico: string; situacaoFuncional: string
  cargoId: string; lotacaoId: string; cargaHoraria: number; turno: string
  tabelaSalarialId?: string; nivelSalarialId?: string
  nivelTitulacao?: string; titulacaoComprovada?: string
  dataAdmissao: string; dataPosse?: string; dataExercicio?: string
  dataEncerramento?: string; motivoEncerramento?: string; atual: boolean; tipoAlteracao: string
  cargo?: { nome: string; codigo: string }
  lotacao?: { nome: string; sigla: string }
  nivelSalarial?: { nivel: string; classe: string; vencimentoBase: number }
  tabelaSalarial?: { nome: string }
}
interface Servidor {
  id: string; matricula: string; nome: string; nomeSocial?: string; cpf: string
  dataNascimento?: string; sexo?: string; estadoCivil?: string; escolaridade?: string; fotoUrl?: string
  vinculos: VinculoFuncional[]; contatos: Contato[]; enderecos: Endereco[]
}

// ── DICIONÁRIOS ───────────────────────────────────────────────────────────────

const TIPO_CONTATO: Record<string, { label: string; isEmail: boolean }> = {
  EMAIL_PESSOAL:        { label: 'E-mail pessoal',      isEmail: true  },
  EMAIL_INSTITUCIONAL:  { label: 'E-mail institucional', isEmail: true  },
  CELULAR:              { label: 'Celular',              isEmail: false },
  TELEFONE_FIXO:        { label: 'Telefone fixo',        isEmail: false },
  WHATSAPP:             { label: 'WhatsApp',             isEmail: false },
}
const REGIME: Record<string, string> = {
  ESTATUTARIO: 'Estatutário', CELETISTA: 'CLT', COMISSIONADO: 'Comissionado',
  ESTAGIARIO: 'Estagiário', TEMPORARIO: 'Temporário', AGENTE_POLITICO: 'Ag. Político',
}
const TURNO: Record<string, string> = {
  MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite', INTEGRAL: 'Integral', PLANTAO_12x36: '12×36', PLANTAO_24x48: '24×48',
}
const SITUACAO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  ATIVO:      { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  AFASTADO:   { bg: '#fefce8', color: '#a16207', border: '#fde047' },
  CEDIDO:     { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  LICENCA:    { bg: '#fdf4ff', color: '#7e22ce', border: '#d8b4fe' },
  SUSPENSO:   { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
  EXONERADO:  { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
  APOSENTADO: { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
  FALECIDO:   { bg: '#1e293b', color: '#94a3b8', border: '#334155' },
}
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

// ── BASE STYLES (100% inline — bypassa purge do Tailwind) ─────────────────────

const S = {
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 } as React.CSSProperties,
  input: { height: 36, width: '100%', padding: '0 12px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' as const },
  label: { fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#4f46e5', color: '#fff', border: 'none' } as React.CSSProperties,
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#374151', border: '1px solid #e2e8f0' } as React.CSSProperties,
  btnDanger: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' } as React.CSSProperties,
  btnIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', background: 'transparent', border: 'none', color: '#94a3b8' } as React.CSSProperties,
  formBox: { border: '1px solid #a5b4fc', background: '#eef2ff', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 10 },
  formBoxWarn: { border: '1px solid #fbbf24', background: '#fffbeb', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 10 },
  emptyBox: { textAlign: 'center' as const, padding: '32px 16px', border: '2px dashed #e2e8f0', borderRadius: 12, color: '#94a3b8' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
}

// ── FIELD READONLY ────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#0f172a', marginTop: 3 }}>{value || '—'}</p>
    </div>
  )
}

// ── MODAL CONFIRMAÇÃO EXCLUSÃO ────────────────────────────────────────────────

function ModalExcluirServidor({ nome, onConfirm, onClose, loading }: {
  nome: string; onConfirm: () => void; onClose: () => void; loading: boolean
}) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} color="#b91c1c" />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Excluir servidor?</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Esta ação é <strong>irreversível</strong>. O cadastro de <strong>{nome}</strong> e todos os seus dados (vínculos, contatos, endereços e documentos) serão permanentemente removidos.
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            Só é possível excluir servidores sem folhas de pagamento ou outros registros funcionais.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button style={{ ...S.btnOutline, flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnDanger, flex: 1, justifyContent: 'center', background: '#b91c1c', color: '#fff', border: 'none' }} onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 size={14} /> : <Trash2 size={14} />} Excluir permanentemente
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PANEL CONTATOS ────────────────────────────────────────────────────────────

function ContatosPanel({ servidorId }: { servidorId: string }) {
  const { toast } = useToast()
  const [contatos, setContatos] = useState<Contato[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tipo: 'CELULAR', valor: '', principal: false })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: r } = await servidoresApi.listarContatos(servidorId)
      setContatos((r as any).data ?? r ?? [])
    } catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
    finally { setLoading(false) }
  }, [servidorId])

  useEffect(() => { load() }, [load])

  const reset = () => { setForm({ tipo: 'CELULAR', valor: '', principal: false }); setEditId(null); setShowForm(false) }

  const save = async () => {
    if (!form.valor.trim()) return
    setSaving(true)
    try {
      if (editId) await servidoresApi.atualizarContato(servidorId, editId, form)
      else await servidoresApi.criarContato(servidorId, form)
      toast({ title: editId ? 'Contato atualizado.' : 'Contato adicionado.' })
      reset(); load()
    } catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Remover este contato?')) return
    try { await servidoresApi.removerContato(servidorId, id); toast({ title: 'Removido.' }); load() }
    catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
  }

  const setPrincipal = async (id: string) => {
    try { await servidoresApi.atualizarContato(servidorId, id, { principal: true }); load() }
    catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
  }

  if (loading) return <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {contatos.length === 0 && !showForm && (
        <div style={S.emptyBox}><Phone size={28} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} /><p style={{ fontSize: 13, margin: 0 }}>Nenhum contato cadastrado</p></div>
      )}

      {contatos.map((c) => {
        const isEmail = TIPO_CONTATO[c.tipo]?.isEmail
        return (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1px solid ${c.principal ? '#a5b4fc' : '#e2e8f0'}`, background: c.principal ? '#eef2ff' : '#f8fafc' }}>
            <div style={{ padding: 8, borderRadius: 8, background: c.principal ? '#c7d2fe' : '#e2e8f0', flexShrink: 0 }}>
              {isEmail ? <Mail size={14} color={c.principal ? '#4338ca' : '#64748b'} /> : <Phone size={14} color={c.principal ? '#4338ca' : '#64748b'} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{TIPO_CONTATO[c.tipo]?.label ?? c.tipo}</span>
                {c.principal && <span style={{ fontSize: 10, fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '1px 7px', borderRadius: 99 }}>PRINCIPAL</span>}
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: '1px 0 0' }}>{c.valor}</p>
            </div>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {!c.principal && <button style={S.btnIcon} title="Principal" onClick={() => setPrincipal(c.id)}><Star size={14} /></button>}
              <button style={S.btnIcon} onClick={() => { setForm({ tipo: c.tipo, valor: c.valor, principal: c.principal }); setEditId(c.id); setShowForm(true) }}><Edit size={14} /></button>
              <button style={{ ...S.btnIcon, color: '#fca5a5' }} onClick={() => remove(c.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        )
      })}

      {showForm && (
        <div style={S.formBox}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', margin: 0 }}>{editId ? 'Editar contato' : 'Novo contato'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div><label style={S.label}>Tipo</label><select value={form.tipo} onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value }))} style={S.input}>{Object.entries(TIPO_CONTATO).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}</select></div>
            <div><label style={S.label}>Valor *</label><input value={form.valor} onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))} placeholder={form.tipo.includes('EMAIL') ? 'email@exemplo.com' : '(00) 00000-0000'} style={S.input} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            <input type="checkbox" checked={form.principal} onChange={(e) => setForm(f => ({ ...f, principal: e.target.checked }))} /> Definir como principal
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={S.btnOutline} onClick={reset}><X size={13} />Cancelar</button>
            <button style={S.btnPrimary} onClick={save} disabled={saving}>{saving ? <Loader2 size={13} /> : <Save size={13} />} Salvar</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button style={{ ...S.btnOutline, width: '100%', justifyContent: 'center', borderStyle: 'dashed' }} onClick={() => { setEditId(null); setShowForm(true) }}>
          <Plus size={14} /> Adicionar contato
        </button>
      )}
    </div>
  )
}

// ── PANEL ENDEREÇOS ───────────────────────────────────────────────────────────

function EnderecosPanel({ servidorId }: { servidorId: string }) {
  const { toast } = useToast()
  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const blank = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', uf: 'SP', principal: false }
  const [form, setForm] = useState(blank)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: r } = await servidoresApi.listarEnderecos(servidorId)
      setEnderecos((r as any).data ?? r ?? [])
    } catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
    finally { setLoading(false) }
  }, [servidorId])

  useEffect(() => { load() }, [load])

  const reset = () => { setForm(blank); setEditId(null); setShowForm(false) }

  const buscarCep = async (cep: string) => {
    const d = cep.replace(/\D/g, '')
    if (d.length !== 8) return
    try {
      const r = await window.fetch(`https://viacep.com.br/ws/${d}/json/`)
      const j = await r.json()
      if (!j.erro) setForm(f => ({ ...f, logradouro: j.logradouro || f.logradouro, bairro: j.bairro || f.bairro, municipio: j.localidade || f.municipio, uf: j.uf || f.uf }))
    } catch { /**/ }
  }

  const save = async () => {
    if (!form.logradouro || !form.numero || !form.municipio || !form.uf) { toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios.' }); return }
    setSaving(true)
    try {
      if (editId) await servidoresApi.atualizarEndereco(servidorId, editId, form)
      else await servidoresApi.criarEndereco(servidorId, form)
      toast({ title: editId ? 'Endereço atualizado.' : 'Endereço adicionado.' })
      reset(); load()
    } catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Remover este endereço?')) return
    try { await servidoresApi.removerEndereco(servidorId, id); toast({ title: 'Removido.' }); load() }
    catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
  }

  const setPrincipal = async (id: string) => {
    try { await servidoresApi.atualizarEndereco(servidorId, id, { principal: true }); load() }
    catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
  }

  if (loading) return <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {enderecos.length === 0 && !showForm && (
        <div style={S.emptyBox}><MapPin size={28} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} /><p style={{ fontSize: 13, margin: 0 }}>Nenhum endereço cadastrado</p></div>
      )}

      {enderecos.map((e) => (
        <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${e.principal ? '#a5b4fc' : '#e2e8f0'}`, background: e.principal ? '#eef2ff' : '#f8fafc' }}>
          <div style={{ padding: 8, borderRadius: 8, background: e.principal ? '#c7d2fe' : '#e2e8f0', flexShrink: 0, marginTop: 2 }}>
            <MapPin size={14} color={e.principal ? '#4338ca' : '#64748b'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {e.principal && <span style={{ fontSize: 10, fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '1px 7px', borderRadius: 99, display: 'inline-block', marginBottom: 3 }}>PRINCIPAL</span>}
            <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0 }}>{e.logradouro}, {e.numero}{e.complemento ? `, ${e.complemento}` : ''}</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{e.bairro} · {e.municipio}/{e.uf}{e.cep ? ` · CEP ${e.cep}` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {!e.principal && <button style={S.btnIcon} title="Principal" onClick={() => setPrincipal(e.id)}><Star size={14} /></button>}
            <button style={S.btnIcon} onClick={() => { setForm({ cep: e.cep ?? '', logradouro: e.logradouro, numero: e.numero, complemento: e.complemento ?? '', bairro: e.bairro, municipio: e.municipio, uf: e.uf, principal: e.principal }); setEditId(e.id); setShowForm(true) }}><Edit size={14} /></button>
            <button style={{ ...S.btnIcon, color: '#fca5a5' }} onClick={() => remove(e.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      {showForm && (
        <div style={S.formBox}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', margin: 0 }}>{editId ? 'Editar endereço' : 'Novo endereço'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 10 }}>
            <div><label style={S.label}>CEP</label><input value={form.cep} onChange={(e) => set('cep', e.target.value)} onBlur={(e) => buscarCep(e.target.value)} placeholder="00000-000" maxLength={9} style={S.input} /></div>
            <div><label style={S.label}>Logradouro *</label><input value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} style={S.input} /></div>
            <div><label style={S.label}>Número *</label><input value={form.numero} onChange={(e) => set('numero', e.target.value)} style={S.input} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 10 }}>
            <div><label style={S.label}>Complemento</label><input value={form.complemento} onChange={(e) => set('complemento', e.target.value)} placeholder="Apto, sala…" style={S.input} /></div>
            <div><label style={S.label}>Bairro</label><input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} style={S.input} /></div>
            <div><label style={S.label}>Município *</label><input value={form.municipio} onChange={(e) => set('municipio', e.target.value)} style={S.input} /></div>
            <div><label style={S.label}>UF *</label><select value={form.uf} onChange={(e) => set('uf', e.target.value)} style={S.input}>{UFS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            <input type="checkbox" checked={form.principal} onChange={(e) => set('principal', e.target.checked)} /> Definir como principal
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={S.btnOutline} onClick={reset}><X size={13} />Cancelar</button>
            <button style={S.btnPrimary} onClick={save} disabled={saving}>{saving ? <Loader2 size={13} /> : <Save size={13} />} Salvar</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button style={{ ...S.btnOutline, width: '100%', justifyContent: 'center', borderStyle: 'dashed' }} onClick={() => { setEditId(null); setForm(blank); setShowForm(true) }}>
          <Plus size={14} /> Adicionar endereço
        </button>
      )}
    </div>
  )
}

// ── PANEL VÍNCULOS ────────────────────────────────────────────────────────────

interface OpcaoSelect { id: string; label: string }

const NIVEIS_TITULACAO = ['I','II','III','IV','V']
const TIPOS_ALTERACAO_NOVA = ['TRANSFERENCIA_LOTACAO','MUDANCA_CARGO','MUDANCA_REGIME','MUDANCA_JORNADA','ENQUADRAMENTO','REINTEGRACAO','CESSAO']

function SelectField({ label, value, onChange, options, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void
  options: OpcaoSelect[]; placeholder?: string; disabled?: boolean
}) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...S.input, color: value ? '#0f172a' : '#94a3b8' }} disabled={disabled}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  )
}

function VinculosPanel({ vinculos, servidorId }: { vinculos: VinculoFuncional[]; servidorId: string }) {
  const { toast } = useToast()
  const [expandedId, setExpandedId] = useState<string | null>(vinculos.find(v => v.atual)?.id ?? null)

  // Dados auxiliares
  const [todosOsCargos, setTodosOsCargos] = useState<(OpcaoSelect & { regimeJuridico?: string })[]>([])
  const [lotacoes, setLotacoes] = useState<OpcaoSelect[]>([])
  const [tabelas, setTabelas] = useState<(OpcaoSelect & { regime?: string })[]>([])
  const [loadingAux, setLoadingAux] = useState(true)
  const [tabelaSelNova, setTabelaSelNova] = useState('')
  const [tabelaSelCorr, setTabelaSelCorr] = useState('')

  useEffect(() => {
    Promise.all([
      cargosApi.listar({ limit: '500' }),
      cargosApi.lotacoes({ limit: '500' }),
      cargosApi.tabelas(),
    ]).then(([rc, rl, rt]) => {
      const getData = (r: any) => r.data?.data ?? r.data ?? []
      setTodosOsCargos(getData(rc).map((c: any) => ({ id: c.id, label: `${c.codigo} — ${c.nome}`, regimeJuridico: c.regimeJuridico })))
      setLotacoes(getData(rl).map((l: any) => ({ id: l.id, label: l.sigla ? `${l.sigla} — ${l.nome}` : l.nome })))
      setTabelas(getData(rt).map((t: any) => ({ id: t.id, label: t.nome, regime: t.regime })))
    }).catch(() => {}).finally(() => setLoadingAux(false))
  }, [])

  const carregarNiveis = useCallback(async (tabelaId: string, setter: (v: string) => void, setNiveisLocal: (n: OpcaoSelect[]) => void) => {
    if (!tabelaId) { setNiveisLocal([]); return }
    setter(tabelaId)
    try {
      const { data: r } = await cargosApi.niveis(tabelaId)
      const lista = (r as any).data ?? r ?? []
      setNiveisLocal(lista.map((n: any) => ({ id: n.id, label: `Nível ${n.nivel} / Classe ${n.classe} — ${formatCurrency(n.vencimentoBase)}` })))
    } catch { setNiveisLocal([]) }
  }, [])

  // Níveis para o form de nova alteração
  const [niveisNova, setNiveisNova] = useState<OpcaoSelect[]>([])
  // Níveis para o form de correção
  const [niveisCorr, setNiveisCorr] = useState<OpcaoSelect[]>([])

  // Nova alteração funcional
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const BLANK_NOVA = { cargoId: '', lotacaoId: '', tabelaSalarialId: '', nivelSalarialId: '', cargaHoraria: 40, turno: 'INTEGRAL', tipoAlteracao: 'TRANSFERENCIA_LOTACAO', regimeJuridico: vinculos.find(v => v.atual)?.regimeJuridico ?? '' }
  const [form, setForm] = useState(BLANK_NOVA)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const cargosFiltradosNova = form.regimeJuridico
    ? todosOsCargos.filter(c => c.regimeJuridico === form.regimeJuridico)
    : todosOsCargos

  const tabelasFiltradosNova = form.regimeJuridico
    ? tabelas.filter(t => !t.regime || t.regime === form.regimeJuridico)
    : tabelas

  const abrirNova = () => {
    setForm(BLANK_NOVA)
    setTabelaSelNova('')
    setNiveisNova([])
    setCorrigindoId(null)
    setShowForm(true)
  }

  const saveVinculo = async () => {
    setSaving(true)
    try {
      const payload: any = {
        cargoId:        form.cargoId,
        lotacaoId:      form.lotacaoId,
        cargaHoraria:   form.cargaHoraria,
        turno:          form.turno,
        tipoAlteracao:  form.tipoAlteracao,
        regimeJuridico: form.regimeJuridico || undefined,
        ...(form.tabelaSalarialId && { tabelaSalarialId: form.tabelaSalarialId }),
        ...(form.nivelSalarialId  && { nivelSalarialId:  form.nivelSalarialId }),
      }
      await servidoresApi.atualizarVinculo(servidorId, payload)
      toast({ title: 'Vínculo atualizado. Recarregando…' })
      setShowForm(false)
      setTimeout(() => window.location.reload(), 800)
    } catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
    finally { setSaving(false) }
  }

  // Correção de vínculo
  const [corrigindoId, setCorrigindoId] = useState<string | null>(null)
  const BLANK_CORR = { regimeJuridico: '', cargoId: '', tabelaSalarialId: '', nivelSalarialId: '', lotacaoId: '', cargaHoraria: 40, turno: 'INTEGRAL', dataAdmissao: '', dataPosse: '', dataExercicio: '', nivelTitulacao: '', tipoAlteracao: 'ADMISSAO' }
  const [correcao, setCorrecao] = useState(BLANK_CORR)
  const setC = (k: string, v: any) => setCorrecao(f => ({ ...f, [k]: v }))
  const [savingCorrecao, setSavingCorrecao] = useState(false)

  const cargosFiltradosCorr = correcao.regimeJuridico
    ? todosOsCargos.filter(c => c.regimeJuridico === correcao.regimeJuridico)
    : todosOsCargos

  const tabelasFiltradosCorr = correcao.regimeJuridico
    ? tabelas.filter(t => !t.regime || t.regime === correcao.regimeJuridico)
    : tabelas

  const abrirCorrecao = async (v: VinculoFuncional) => {
    const dados = {
      regimeJuridico:   v.regimeJuridico,
      cargoId:          v.cargoId,
      tabelaSalarialId: v.tabelaSalarialId ?? '',
      nivelSalarialId:  v.nivelSalarialId ?? '',
      lotacaoId:        v.lotacaoId,
      cargaHoraria:     v.cargaHoraria,
      turno:            v.turno,
      dataAdmissao:     v.dataAdmissao?.slice(0, 10) ?? '',
      dataPosse:        v.dataPosse?.slice(0, 10) ?? '',
      dataExercicio:    v.dataExercicio?.slice(0, 10) ?? '',
      nivelTitulacao:   v.nivelTitulacao ?? '',
      tipoAlteracao:    v.tipoAlteracao,
    }
    setCorrecao(dados)
    setShowForm(false)
    setCorrigindoId(v.id)
    if (v.tabelaSalarialId) {
      await carregarNiveis(v.tabelaSalarialId, setTabelaSelCorr, setNiveisCorr)
    }
  }

  const salvarCorrecao = async () => {
    if (!corrigindoId) return
    setSavingCorrecao(true)
    try {
      const payload: any = {
        regimeJuridico: correcao.regimeJuridico,
        cargoId:        correcao.cargoId,
        lotacaoId:      correcao.lotacaoId,
        cargaHoraria:   correcao.cargaHoraria,
        turno:          correcao.turno,
        dataAdmissao:   correcao.dataAdmissao,
        dataPosse:      correcao.dataPosse,
        dataExercicio:  correcao.dataExercicio,
        nivelTitulacao: correcao.nivelTitulacao,
        tipoAlteracao:  correcao.tipoAlteracao,
        ...(correcao.tabelaSalarialId && { tabelaSalarialId: correcao.tabelaSalarialId }),
        ...(correcao.nivelSalarialId  && { nivelSalarialId:  correcao.nivelSalarialId }),
      }
      await servidoresApi.corrigirVinculo(servidorId, corrigindoId, payload)
      toast({ title: 'Vínculo corrigido. Recarregando…' })
      setCorrigindoId(null)
      setTimeout(() => window.location.reload(), 800)
    } catch (e) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(e) }) }
    finally { setSavingCorrecao(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {vinculos.map((v) => {
        const ss = SITUACAO_STYLE[v.situacaoFuncional] ?? SITUACAO_STYLE.ATIVO
        const expanded = expandedId === v.id
        const corrigindo = corrigindoId === v.id
        return (
          <div key={v.id} style={{ border: `1px solid ${v.atual ? '#818cf8' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* Cabeçalho */}
            <button onClick={() => setExpandedId(expanded ? null : v.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: v.atual ? '#eef2ff' : '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {v.atual && <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #86efac', padding: '1px 8px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={10} /> ATUAL</span>}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>{v.situacaoFuncional.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{REGIME[v.regimeJuridico] ?? v.regimeJuridico}</span>
                  {v.nivelTitulacao && <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '1px 6px', borderRadius: 4 }}>Nível {v.nivelTitulacao}</span>}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '4px 0 0' }}>
                  {v.cargo?.nome ?? '—'}
                  {v.nivelSalarial && <span style={{ fontWeight: 400, color: '#64748b' }}> · {v.nivelSalarial.classe} / Nível {v.nivelSalarial.nivel}</span>}
                </p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{v.lotacao?.nome ?? '—'}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {v.nivelSalarial && <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#059669', margin: 0 }}>{formatCurrency(v.nivelSalarial.vencimentoBase)}</p>}
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{formatDate(v.dataAdmissao)}</p>
              </div>
              <ChevronDown size={16} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
            </button>

            {/* Detalhes */}
            {expanded && !corrigindo && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 20px' }}>
                  <Field label="Admissão"        value={formatDate(v.dataAdmissao)} />
                  <Field label="Posse"           value={v.dataPosse ? formatDate(v.dataPosse) : '—'} />
                  <Field label="Exercício"       value={v.dataExercicio ? formatDate(v.dataExercicio) : '—'} />
                  <Field label="Encerramento"    value={v.dataEncerramento ? formatDate(v.dataEncerramento) : '—'} />
                  <Field label="Carga horária"   value={`${v.cargaHoraria}h`} />
                  <Field label="Turno"           value={TURNO[v.turno] ?? v.turno} />
                  <Field label="Tabela salarial" value={v.tabelaSalarial?.nome} />
                  <Field label="Tipo alteração"  value={v.tipoAlteracao.replace(/_/g, ' ')} />
                  {v.motivoEncerramento && <div style={{ gridColumn: '1/-1' }}><Field label="Motivo encerramento" value={v.motivoEncerramento} /></div>}
                </div>
                <div style={{ marginTop: 14 }}>
                  <button
                    style={{ ...S.btnOutline, fontSize: 12, padding: '5px 12px', borderColor: '#fbbf24', color: '#92400e', background: '#fffbeb' }}
                    onClick={(e) => { e.stopPropagation(); abrirCorrecao(v) }}
                    title="Edição direta sem histórico. Bloqueado se houver folhas geradas."
                  >
                    <Edit size={12} /> Corrigir vínculo
                  </button>
                </div>
              </div>
            )}

            {/* Formulário de correção */}
            {corrigindo && (
              <div style={{ ...S.formBoxWarn, margin: 0, borderRadius: 0, borderTop: '1px solid #fbbf24' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <AlertTriangle size={16} color="#d97706" style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', margin: 0 }}>Corrigir vínculo</p>
                    <p style={{ fontSize: 11, color: '#a16207', margin: '2px 0 0', lineHeight: 1.4 }}>
                      Edição direta — sem geração de histórico. Só permitido se não houver folhas de pagamento geradas para este servidor.
                    </p>
                  </div>
                </div>
                {loadingAux ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13 }}><Loader2 size={14} /> Carregando dados…</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <SelectField label="Regime jurídico *" value={correcao.regimeJuridico} onChange={(v) => { setC('regimeJuridico', v); setC('cargoId', ''); setC('tabelaSalarialId', ''); setC('nivelSalarialId', ''); setNiveisCorr([]); setTabelaSelCorr('') }} options={Object.entries(REGIME).map(([k, l]) => ({ id: k, label: l }))} placeholder="Selecione…" />
                    <SelectField label="Cargo *" value={correcao.cargoId} onChange={(v) => setC('cargoId', v)} options={cargosFiltradosCorr} placeholder="Selecione o cargo…" />
                    <SelectField label="Lotação *" value={correcao.lotacaoId} onChange={(v) => setC('lotacaoId', v)} options={lotacoes} placeholder="Selecione a lotação…" />
                    <SelectField label="Tabela salarial" value={correcao.tabelaSalarialId} onChange={(v) => { setC('tabelaSalarialId', v); setC('nivelSalarialId', ''); carregarNiveis(v, setTabelaSelCorr, setNiveisCorr) }} options={tabelasFiltradosCorr} placeholder="Selecione a tabela…" />
                    <SelectField label="Nível salarial" value={correcao.nivelSalarialId} onChange={(v) => setC('nivelSalarialId', v)} options={niveisCorr} placeholder={tabelaSelCorr ? 'Selecione o nível…' : 'Selecione a tabela primeiro'} disabled={!tabelaSelCorr} />
                    <SelectField label="Nível titulação" value={correcao.nivelTitulacao} onChange={(v) => setC('nivelTitulacao', v)} options={NIVEIS_TITULACAO.map(n => ({ id: n, label: `Nível ${n}` }))} placeholder="Nenhum" />
                    <SelectField label="Turno *" value={correcao.turno} onChange={(v) => setC('turno', v)} options={Object.entries(TURNO).map(([k, l]) => ({ id: k, label: l }))} />
                    <div>
                      <label style={S.label}>Carga horária (h/sem) *</label>
                      <input type="number" value={correcao.cargaHoraria} onChange={(e) => setC('cargaHoraria', +e.target.value)} style={S.input} min={1} max={44} />
                    </div>
                    <div>
                      <label style={S.label}>Data admissão *</label>
                      <input type="date" value={correcao.dataAdmissao} onChange={(e) => setC('dataAdmissao', e.target.value)} style={S.input} />
                    </div>
                    <div>
                      <label style={S.label}>Data posse</label>
                      <input type="date" value={correcao.dataPosse} onChange={(e) => setC('dataPosse', e.target.value)} style={S.input} />
                    </div>
                    <div>
                      <label style={S.label}>Data exercício</label>
                      <input type="date" value={correcao.dataExercicio} onChange={(e) => setC('dataExercicio', e.target.value)} style={S.input} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={S.btnOutline} onClick={() => setCorrigindoId(null)}><X size={13} /> Cancelar</button>
                  <button style={{ ...S.btnPrimary, background: '#d97706' }} onClick={salvarCorrecao} disabled={savingCorrecao || loadingAux}>
                    {savingCorrecao ? <Loader2 size={13} /> : <Save size={13} />} Salvar correção
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Form nova alteração funcional */}
      {showForm && (
        <div style={S.formBox}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', margin: 0 }}>Nova alteração funcional</p>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>O vínculo atual será encerrado e um novo registro será criado. Preencha apenas os campos que mudam.</p>
          {loadingAux ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13 }}><Loader2 size={14} /> Carregando dados…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <SelectField label="Tipo de alteração *" value={form.tipoAlteracao} onChange={(v) => set('tipoAlteracao', v)} options={TIPOS_ALTERACAO_NOVA.map(t => ({ id: t, label: t.replace(/_/g, ' ') }))} />
              <SelectField label="Regime jurídico" value={form.regimeJuridico} onChange={(v) => { set('regimeJuridico', v); set('cargoId', ''); set('tabelaSalarialId', ''); set('nivelSalarialId', ''); setNiveisNova([]); setTabelaSelNova('') }} options={Object.entries(REGIME).map(([k, l]) => ({ id: k, label: l }))} placeholder="Manter atual…" />
              <SelectField label="Cargo" value={form.cargoId} onChange={(v) => set('cargoId', v)} options={cargosFiltradosNova} placeholder="Manter atual…" />
              <SelectField label="Lotação" value={form.lotacaoId} onChange={(v) => set('lotacaoId', v)} options={lotacoes} placeholder="Manter atual…" />
              <SelectField label="Tabela salarial" value={form.tabelaSalarialId} onChange={(v) => { set('tabelaSalarialId', v); set('nivelSalarialId', ''); carregarNiveis(v, setTabelaSelNova, setNiveisNova) }} options={tabelasFiltradosNova} placeholder="Manter atual…" />
              <SelectField label="Nível salarial" value={form.nivelSalarialId} onChange={(v) => set('nivelSalarialId', v)} options={niveisNova} placeholder={tabelaSelNova ? 'Selecione o nível…' : 'Selecione a tabela primeiro'} disabled={!tabelaSelNova} />
              <SelectField label="Turno" value={form.turno} onChange={(v) => set('turno', v)} options={Object.entries(TURNO).map(([k, l]) => ({ id: k, label: l }))} />
              <div>
                <label style={S.label}>Carga horária (h/sem)</label>
                <input type="number" value={form.cargaHoraria} onChange={(e) => set('cargaHoraria', +e.target.value)} style={S.input} min={1} max={44} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={S.btnOutline} onClick={() => setShowForm(false)}><X size={13} /> Cancelar</button>
            <button style={S.btnPrimary} onClick={saveVinculo} disabled={saving || loadingAux}>
              {saving ? <Loader2 size={13} /> : <Save size={13} />} Salvar alteração
            </button>
          </div>
        </div>
      )}

      {!showForm && !corrigindoId && (
        <button style={{ ...S.btnOutline, alignSelf: 'flex-start' }} onClick={abrirNova}>
          <Plus size={14} /> Nova alteração funcional
        </button>
      )}
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────

type Tab = 'funcional' | 'pessoal' | 'contatos' | 'enderecos'
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'funcional',  label: 'Vínculos',       icon: Briefcase },
  { id: 'pessoal',    label: 'Dados pessoais', icon: User      },
  { id: 'contatos',   label: 'Contatos',       icon: Phone     },
  { id: 'enderecos',  label: 'Endereços',      icon: MapPin    },
]

export default function ServidorDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [servidor, setServidor] = useState<Servidor | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('funcional')
  const [showModalExcluir, setShowModalExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    if (!id) return
    servidoresApi.obter(id)
      .then(({ data: r }) => setServidor((r as any).data ?? r))
      .catch((e) => toast({ variant: 'destructive', title: 'Erro ao carregar servidor', description: extractApiError(e) }))
      .finally(() => setLoading(false))
  }, [id])

  const handleExcluir = async () => {
    if (!id) return
    setExcluindo(true)
    try {
      await servidoresApi.excluir(id)
      toast({ title: 'Servidor excluído com sucesso.' })
      navigate('/servidores')
    } catch (e) {
      toast({ variant: 'destructive', title: 'Não foi possível excluir', description: extractApiError(e) })
      setShowModalExcluir(false)
    } finally { setExcluindo(false) }
  }

  const vinculoAtual = servidor?.vinculos.find(v => v.atual)
  const initials = servidor?.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>

      {showModalExcluir && servidor && (
        <ModalExcluirServidor
          nome={servidor.nome}
          onConfirm={handleExcluir}
          onClose={() => setShowModalExcluir(false)}
          loading={excluindo}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <button style={{ ...S.btnOutline, padding: '6px 12px' }} onClick={() => navigate('/servidores')}>
          <ArrowLeft size={15} /> Servidores
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {id && (
            <button style={S.btnPrimary} onClick={() => navigate(`/servidores/${id}/editar`)}>
              <Edit size={14} /> Editar dados pessoais
            </button>
          )}
          {id && servidor && (
            <button style={S.btnDanger} onClick={() => setShowModalExcluir(true)}>
              <Trash2 size={14} /> Excluir servidor
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      {loading ? (
        <div style={{ ...S.card, display: 'flex', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: '#e2e8f0', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 20, background: '#e2e8f0', borderRadius: 6, width: '50%' }} />
            <div style={{ height: 14, background: '#f1f5f9', borderRadius: 6, width: '35%' }} />
          </div>
        </div>
      ) : servidor ? (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          {/* Info header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', boxShadow: '0 4px 14px rgba(79,70,229,.35)' }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>{servidor.nome}</h1>
                {vinculoAtual && (() => { const ss = SITUACAO_STYLE[vinculoAtual.situacaoFuncional] ?? SITUACAO_STYLE.ATIVO; return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>{vinculoAtual.situacaoFuncional.replace(/_/g,' ')}</span> })()}
              </div>
              {servidor.nomeSocial && <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>Nome social: {servidor.nomeSocial}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px', marginTop: 12 }}>
                {[
                  { label: 'Matrícula', value: servidor.matricula },
                  { label: 'CPF', value: formatCPF(servidor.cpf) },
                  vinculoAtual?.cargo ? { label: 'Cargo', value: vinculoAtual.cargo.nome } : null,
                  vinculoAtual?.lotacao ? { label: 'Lotação', value: vinculoAtual.lotacao.nome } : null,
                  vinculoAtual?.nivelSalarial ? { label: 'Vencimento', value: formatCurrency(vinculoAtual.nivelSalarial.vencimentoBase) } : null,
                ].filter(Boolean).map(({ label, value }: any) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0 0' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderTop: '1px solid #e2e8f0', overflowX: 'auto' }}>
            {TABS.map(({ id: tabId, label, icon: Icon }) => (
              <button key={tabId} onClick={() => setActiveTab(tabId)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tabId ? '#4f46e5' : 'transparent'}`, color: activeTab === tabId ? '#4f46e5' : '#64748b', transition: 'color 0.15s' }}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ ...S.card, textAlign: 'center', color: '#94a3b8', padding: 48 }}>Servidor não encontrado.</div>
      )}

      {/* Conteúdo das abas */}
      {!loading && servidor && (
        <div style={S.card}>
          {activeTab === 'funcional' && id && <VinculosPanel vinculos={servidor.vinculos} servidorId={id} />}
          {activeTab === 'pessoal' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px 32px' }}>
              <Field label="Nome completo"       value={servidor.nome} />
              <Field label="Nome social"         value={servidor.nomeSocial} />
              <Field label="CPF"                 value={formatCPF(servidor.cpf)} />
              <Field label="Data de nascimento"  value={servidor.dataNascimento ? formatDate(servidor.dataNascimento) : undefined} />
              <Field label="Sexo"                value={servidor.sexo?.replace(/_/g,' ')} />
              <Field label="Estado civil"        value={servidor.estadoCivil?.replace(/_/g,' ')} />
              <Field label="Escolaridade"        value={servidor.escolaridade?.replace(/_/g,' ')} />
            </div>
          )}
          {activeTab === 'contatos'  && id && <ContatosPanel   servidorId={id} />}
          {activeTab === 'enderecos' && id && <EnderecosPanel  servidorId={id} />}
        </div>
      )}
    </div>
  )
}
