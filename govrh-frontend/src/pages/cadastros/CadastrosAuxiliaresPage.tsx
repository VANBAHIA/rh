import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react'
import { folhaApi } from '@/services/folha'
import { toast } from '@/hooks/useToast'
import { extractApiError } from '@/services/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoVerba = 'PROVENTO' | 'DESCONTO' | 'INFORMATIVO'

interface Verba {
  id: string
  codigo: string
  nome: string
  tipo: TipoVerba
  ativo: boolean
  isSistema: boolean
  codigoSistema?: string
}

interface FaixaInss {
  [key: string]: number | null
  ate: number | null
  aliquota: number
}

interface FaixaIrrf {
  [key: string]: number | null
  ate: number | null
  aliquota: number
  deducao: number
}

interface FaixaSalFamilia {
  [key: string]: number | null
  ate: number
  valor: number
}

interface Config {
  percentualRpps?: number
  percentualFgts?: number
  margemConsignavel?: number
  tabelaInss?: FaixaInss[]
  tabelaIrrf?: FaixaIrrf[]
  tabelaSalarioFamilia?: FaixaSalFamilia[]
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPO_VERBA_LABELS: Record<TipoVerba, string> = {
  PROVENTO: 'Provento',
  DESCONTO: 'Desconto',
  INFORMATIVO: 'Informativo',
}

const TIPO_VERBA_COLORS: Record<TipoVerba, string> = {
  PROVENTO:    '#22c55e',
  DESCONTO:    '#ef4444',
  INFORMATIVO: '#94a3b8',
}

// ─── Utilitários de estilo ───────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#131929',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12,
  padding: 24,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d1424',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: 13,
  outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
}

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 6,
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer',
  fontSize: 12,
}

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: '#f87171',
  borderColor: 'rgba(239,68,68,0.2)',
}

// ─── Aba: Verbas ──────────────────────────────────────────────────────────────

interface ModalVerbaProps {
  verba: Partial<Verba> | null
  onClose: () => void
  onSaved: () => void
}

function ModalVerba({ verba, onClose, onSaved }: ModalVerbaProps) {
  const isNew = !verba?.id
  const [form, setForm] = useState({
    codigo: verba?.codigo ?? '',
    nome: verba?.nome ?? '',
    tipo: (verba?.tipo ?? 'PROVENTO') as TipoVerba,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.codigo.trim() || !form.nome.trim()) {
      toast({ title: 'Preencha código e nome', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        await folhaApi.criarVerba(form)
        toast({ title: 'Verba criada' })
      } else {
        await folhaApi.atualizarVerba(verba!.id!, form)
        toast({ title: 'Verba atualizada' })
      }
      onSaved()
    } catch (err) {
      toast({ title: extractApiError(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ ...card, width: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, margin: 0 }}>
            {isNew ? 'Nova Verba' : 'Editar Verba'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>CÓDIGO</label>
            <input
              style={inputStyle}
              value={form.codigo}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
              placeholder="ex: 001"
              maxLength={10}
            />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>NOME</label>
            <input
              style={inputStyle}
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Descrição da verba"
            />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>TIPO</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoVerba }))}
            >
              {(Object.keys(TIPO_VERBA_LABELS) as TipoVerba[]).map(t => (
                <option key={t} value={t}>{TIPO_VERBA_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={btnGhost} onClick={onClose}>Cancelar</button>
          <button style={btnPrimary} onClick={handleSave} disabled={saving}>
            <Save size={13} />
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AbaVerbas() {
  const [verbas, setVerbas] = useState<Verba[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('true')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Partial<Verba> | null | false>(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filtroTipo) params.tipo = filtroTipo
      if (filtroAtivo) params.ativo = filtroAtivo
      if (search) params.q = search
      const res = await folhaApi.verbas(params)
      setVerbas(res.data?.data ?? res.data ?? [])
    } catch {
      setVerbas([])
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, filtroAtivo, search])

  useEffect(() => { carregar() }, [carregar])

  async function handleDesativar(id: string) {
    if (!confirm('Desativar esta verba?')) return
    try {
      await folhaApi.desativarVerba(id)
      toast({ title: 'Verba desativada' })
      carregar()
    } catch (err) {
      toast({ title: extractApiError(err), variant: 'destructive' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {modal !== false && (
        <ModalVerba
          verba={modal}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); carregar() }}
        />
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, width: 220 }}
          placeholder="Buscar por código ou nome…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...inputStyle, width: 150, cursor: 'pointer' }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {(Object.keys(TIPO_VERBA_LABELS) as TipoVerba[]).map(t => (
            <option key={t} value={t}>{TIPO_VERBA_LABELS[t]}</option>
          ))}
        </select>
        <select style={{ ...inputStyle, width: 130, cursor: 'pointer' }} value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <button style={btnPrimary} onClick={() => setModal({})}>
          <Plus size={14} /> Nova Verba
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Código', 'Nome', 'Tipo', 'Natureza', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#475569' }}>Carregando…</td></tr>
            ) : verbas.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#475569' }}>Nenhuma verba encontrada</td></tr>
            ) : verbas.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>{v.codigo}</td>
                <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>
                  {v.nome}
                  {v.isSistema && (
                    <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontWeight: 700, letterSpacing: '0.05em' }}>
                      SISTEMA
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ color: TIPO_VERBA_COLORS[v.tipo], fontSize: 11, fontWeight: 600 }}>
                    {TIPO_VERBA_LABELS[v.tipo]}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>
                  {v.isSistema ? 'Reservada' : 'Customizável'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: v.ativo ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: v.ativo ? '#4ade80' : '#f87171',
                  }}>
                    {v.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {!v.isSistema && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={btnGhost} onClick={() => setModal(v)} title="Editar">
                        <Pencil size={12} />
                      </button>
                      {v.ativo && (
                        <button style={btnDanger} onClick={() => handleDesativar(v.id)} title="Desativar">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Editor de faixas genérico ────────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  placeholder?: string
  width?: number
}

function TabelaFaixas<T extends Record<string, number | null>>({
  rows,
  onChange,
  cols,
  lastRowLabel,
}: {
  rows: T[]
  onChange: (rows: T[]) => void
  cols: ColDef[]
  lastRowLabel: string
}) {
  function update(i: number, key: string, raw: string) {
    const val = raw === '' ? null : parseFloat(raw.replace(',', '.'))
    const next = rows.map((r, idx) => idx === i ? { ...r, [key]: val } : r)
    onChange(next)
  }

  function addRow() {
    const empty: Record<string, null> = {}
    cols.forEach(c => { empty[c.key] = null })
    onChange([...rows, empty as T])
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `${cols.map(c => `${c.width ?? 1}fr`).join(' ')} 32px`, gap: 6 }}>
        {cols.map(c => (
          <div key={c.key} style={{ color: '#475569', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', padding: '0 2px' }}>
            {c.label}
          </div>
        ))}
        <div />
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `${cols.map(c => `${c.width ?? 1}fr`).join(' ')} 32px`, gap: 6, alignItems: 'center' }}>
          {cols.map(c => (
            <div key={c.key} style={{ position: 'relative' }}>
              {c.key === cols[0].key && i === rows.length - 1 ? (
                <input
                  style={{ ...inputStyle, color: '#475569', fontSize: 12 }}
                  value={lastRowLabel}
                  disabled
                />
              ) : (
                <input
                  style={{ ...inputStyle, fontSize: 12 }}
                  type="number"
                  step="any"
                  placeholder={c.placeholder ?? '0'}
                  value={row[c.key] == null ? '' : String(row[c.key])}
                  onChange={e => update(i, c.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <button
            onClick={() => removeRow(i)}
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button style={{ ...btnGhost, alignSelf: 'flex-start', marginTop: 4 }} onClick={addRow}>
        <Plus size={12} /> Adicionar faixa
      </button>
    </div>
  )
}

// ─── Aba: Tabelas ─────────────────────────────────────────────────────────────

function AbaTabelas() {
  const [config, setConfig] = useState<Config>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openSection, setOpenSection] = useState<'inss' | 'irrf' | 'sf'>('inss')

  useEffect(() => {
    folhaApi.config().then(res => {
      const d = res.data?.data ?? res.data ?? {}
      setConfig({
        ...d,
        tabelaInss: d.tabelaInss ?? [],
        tabelaIrrf: d.tabelaIrrf ?? [],
        tabelaSalarioFamilia: d.tabelaSalarioFamilia ?? [],
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function salvar() {
    setSaving(true)
    try {
      await folhaApi.atualizarConfig({
        tabelaInss: config.tabelaInss,
        tabelaIrrf: config.tabelaIrrf,
        tabelaSalarioFamilia: config.tabelaSalarioFamilia,
      })
      toast({ title: 'Tabelas salvas com sucesso' })
    } catch (err) {
      toast({ title: extractApiError(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: '#475569', fontSize: 13 }}>Carregando…</p>

  const colsInss: ColDef[] = [
    { key: 'ate', label: 'Limite superior (R$)', placeholder: 'ex: 1320.00', width: 2 },
    { key: 'aliquota', label: 'Alíquota (%)', placeholder: 'ex: 7.5', width: 1 },
  ]

  const colsIrrf: ColDef[] = [
    { key: 'ate', label: 'Limite superior (R$)', placeholder: 'ex: 1903.98', width: 2 },
    { key: 'aliquota', label: 'Alíquota (%)', placeholder: 'ex: 7.5', width: 1 },
    { key: 'deducao', label: 'Dedução (R$)', placeholder: 'ex: 142.80', width: 1 },
  ]

  const colsSF: ColDef[] = [
    { key: 'ate', label: 'Salário até (R$)', placeholder: 'ex: 1500.00', width: 2 },
    { key: 'valor', label: 'Valor por dependente (R$)', placeholder: 'ex: 62.04', width: 2 },
  ]

  function SectionHeader({ id, label }: { id: 'inss' | 'irrf' | 'sf'; label: string }) {
    const open = openSection === id
    return (
      <button
        onClick={() => setOpenSection(id)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '12px 0', background: 'none', border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          color: open ? '#e2e8f0' : '#94a3b8',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {label}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <SectionHeader id="inss" label="Tabela INSS / RPPS (alíquotas progressivas)" />
      {openSection === 'inss' && (
        <div style={{ paddingTop: 16, paddingBottom: 8 }}>
          <TabelaFaixas<FaixaInss>
            rows={config.tabelaInss ?? []}
            onChange={rows => setConfig(c => ({ ...c, tabelaInss: rows }))}
            cols={colsInss}
            lastRowLabel="Acima do último limite"
          />
        </div>
      )}

      <SectionHeader id="irrf" label="Tabela IRRF (alíquotas progressivas)" />
      {openSection === 'irrf' && (
        <div style={{ paddingTop: 16, paddingBottom: 8 }}>
          <TabelaFaixas<FaixaIrrf>
            rows={config.tabelaIrrf ?? []}
            onChange={rows => setConfig(c => ({ ...c, tabelaIrrf: rows }))}
            cols={colsIrrf}
            lastRowLabel="Acima do último limite"
          />
        </div>
      )}

      <SectionHeader id="sf" label="Salário Família (por dependente)" />
      {openSection === 'sf' && (
        <div style={{ paddingTop: 16, paddingBottom: 8 }}>
          <TabelaFaixas<FaixaSalFamilia>
            rows={config.tabelaSalarioFamilia ?? []}
            onChange={rows => setConfig(c => ({ ...c, tabelaSalarioFamilia: rows }))}
            cols={colsSF}
            lastRowLabel="Acima do último limite"
          />
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnPrimary} onClick={salvar} disabled={saving}>
          <Save size={13} />
          {saving ? 'Salvando…' : 'Salvar Tabelas'}
        </button>
      </div>
    </div>
  )
}

// ─── Aba: Parâmetros Gerais ───────────────────────────────────────────────────

function AbaParametros() {
  const [form, setForm] = useState({
    percentualRpps: '',
    percentualFgts: '',
    margemConsignavel: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    folhaApi.config().then(res => {
      const d = res.data?.data ?? res.data ?? {}
      setForm({
        percentualRpps: d.percentualRpps != null ? String(d.percentualRpps) : '',
        percentualFgts: d.percentualFgts != null ? String(d.percentualFgts) : '',
        margemConsignavel: d.margemConsignavel != null ? String(d.margemConsignavel) : '',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function salvar() {
    setSaving(true)
    try {
      await folhaApi.atualizarConfig({
        percentualRpps: form.percentualRpps ? parseFloat(form.percentualRpps) : undefined,
        percentualFgts: form.percentualFgts ? parseFloat(form.percentualFgts) : undefined,
        margemConsignavel: form.margemConsignavel ? parseFloat(form.margemConsignavel) : undefined,
      })
      toast({ title: 'Parâmetros salvos' })
    } catch (err) {
      toast({ title: extractApiError(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: '#475569', fontSize: 13 }}>Carregando…</p>

  function Field({ label, hint, field }: { label: string; hint?: string; field: keyof typeof form }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>{label}</label>
        <input
          style={{ ...inputStyle, width: 180 }}
          type="number"
          step="any"
          placeholder="0"
          value={form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        />
        {hint && <span style={{ color: '#475569', fontSize: 11 }}>{hint}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
        <Field label="ALÍQUOTA RPPS (%)" hint="Ex: 14 para 14%" field="percentualRpps" />
        <Field label="ALÍQUOTA FGTS (%)" hint="Ex: 8 para 8%" field="percentualFgts" />
        <Field label="MARGEM CONSIGNÁVEL (%)" hint="Ex: 35 para 35%" field="margemConsignavel" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnPrimary} onClick={salvar} disabled={saving}>
          <Save size={13} />
          {saving ? 'Salvando…' : 'Salvar Parâmetros'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Aba = 'verbas' | 'tabelas' | 'parametros'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'verbas',     label: 'Verbas / Rubricas' },
  { id: 'tabelas',    label: 'Tabelas (INSS / IRRF / Sal. Família)' },
  { id: 'parametros', label: 'Parâmetros Gerais' },
]

export default function CadastrosAuxiliaresPage() {
  const [aba, setAba] = useState<Aba>('verbas')

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100%' }}>
      <div>
        <h1 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, margin: 0 }}>Cadastros Auxiliares</h1>
        <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>Verbas, tabelas previdenciárias e parâmetros de cálculo</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: aba === a.id ? '2px solid #818cf8' : '2px solid transparent',
              color: aba === a.id ? '#e2e8f0' : '#64748b',
              fontSize: 13,
              fontWeight: aba === a.id ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div style={card}>
        {aba === 'verbas'     && <AbaVerbas />}
        {aba === 'tabelas'    && <AbaTabelas />}
        {aba === 'parametros' && <AbaParametros />}
      </div>
    </div>
  )
}
