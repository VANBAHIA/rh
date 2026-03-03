import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Briefcase, DollarSign, Clock, Palmtree,
  FileText, TrendingUp, ClipboardList, GraduationCap, Landmark,
  Shield, PenLine, Bell, Globe, Settings, LogOut,
  ChevronLeft, ChevronRight, ShieldCheck, BarChart3, BookOpen,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
}

const mainNav: NavItem[] = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/servidores',    icon: Users,            label: 'Servidores' },
  { to: '/cargos',        icon: Briefcase,        label: 'Cargos & PCCV' },
  { to: '/folha',         icon: DollarSign,       label: 'Folha de Pagamento' },
  { to: '/ponto',         icon: Clock,            label: 'Ponto & Escalas' },
  { to: '/ferias',        icon: Palmtree,         label: 'Férias' },
  { to: '/licencas',      icon: FileText,         label: 'Licenças' },
  { to: '/progressao',    icon: TrendingUp,       label: 'Progressão' },
  { to: '/concurso',      icon: ClipboardList,    label: 'Concursos' },
  { to: '/aposentadoria', icon: GraduationCap,    label: 'Aposentadoria' },
  { to: '/disciplinar',   icon: Shield,           label: 'Disciplinar' },
  { to: '/assinatura',    icon: PenLine,          label: 'Assinatura Digital' },
  { to: '/relatorios',    icon: BarChart3,         label: 'Relatórios' },
  { to: '/cadastros',     icon: BookOpen,          label: 'Cadastros Auxiliares' },
]

const secondaryNav: NavItem[] = [
  { to: '/notificacoes',  icon: Bell,     label: 'Notificações' },
  { to: '/transparencia', icon: Globe,    label: 'Transparência' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
]

// Estilos base 100% inline para contornar problemas de purge do Tailwind
const SIDEBAR_BG    = '#0d1424'
const TEXT_DEFAULT  = '#94a3b8'   // slate-400
const TEXT_HOVER    = '#ffffff'
const TEXT_ACTIVE   = '#ffffff'
const HOVER_BG      = 'rgba(255,255,255,0.08)'
const ACTIVE_BG     = 'rgba(99,102,241,0.25)'   // indigo translúcido
const ACTIVE_BORDER = '#818cf8'   // indigo-400
const DIVIDER       = 'rgba(255,255,255,0.07)'

function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  const [hovered, setHovered] = useState(false)

  return (
    <NavLink
      to={item.to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '10px',
        padding: collapsed ? '10px 0' : '9px 12px',
        margin: collapsed ? '1px 4px' : '1px 8px',
        borderRadius: '8px',
        fontSize: '13.5px',
        fontWeight: 500,
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
        justifyContent: collapsed ? 'center' : 'flex-start',
        // borda ativa no lado direito
        borderRight: isActive ? `3px solid ${ACTIVE_BORDER}` : '3px solid transparent',
        // cores
        color: isActive ? TEXT_ACTIVE : hovered ? TEXT_HOVER : TEXT_DEFAULT,
        background: isActive ? ACTIVE_BG : hovered ? HOVER_BG : 'transparent',
      })}
    >
      <Icon
        size={16}
        style={{
          flexShrink: 0,
          color: 'inherit',
        }}
      />
      {!collapsed && (
        <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sairHover, setSairHover] = useState(false)

  const width = collapsed ? 68 : 260

  return (
    <aside
      style={{
        width,
        minWidth: width,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: SIDEBAR_BG,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: collapsed ? '0' : '0 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: `1px solid ${DIVIDER}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(99,102,241,0.3)',
            border: '1px solid rgba(129,140,248,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={16} color="#a5b4fc" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 300, lineHeight: 1, margin: 0 }}>
              GovHR<span style={{ color: '#fbbf24', fontWeight: 700 }}>Pub</span>
            </p>
            <p style={{ color: '#475569', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.15em', marginTop: 4, textTransform: 'uppercase' }}>
              RH Municipal
            </p>
          </div>
        )}
      </div>

      {/* ── Navegação ── */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {mainNav.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}

        {/* Divisor */}
        <div
          style={{
            margin: '8px 12px',
            borderTop: `1px solid ${DIVIDER}`,
          }}
        />

        {secondaryNav.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{ borderTop: `1px solid ${DIVIDER}`, flexShrink: 0 }}>
        {/* Info usuário */}
        {!collapsed && usuario && (
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${DIVIDER}` }}>
            <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario.nome}
            </p>
            <p style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace', margin: '3px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario.email}
            </p>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 9,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#a5b4fc',
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              {usuario.perfil}
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              padding: '5px 8px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Landmark size={11} color="#475569" style={{ flexShrink: 0 }} />
              <p style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario.tenant.nome}
              </p>
            </div>
          </div>
        )}

        {/* Botão Sair */}
        <button
          onClick={() => { logout(); navigate('/login') }}
          onMouseEnter={() => setSairHover(true)}
          onMouseLeave={() => setSairHover(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 10,
            width: '100%',
            padding: collapsed ? '14px 0' : '12px 18px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: sairHover ? 'rgba(239,68,68,0.1)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: sairHover ? '#f87171' : '#64748b',
            fontSize: 13.5,
            fontWeight: 500,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <LogOut size={16} style={{ flexShrink: 0, color: 'inherit' }} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* ── Botão colapsar ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          top: 68,
          right: -12,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#4f46e5',
          border: '2px solid #4338ca',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'background 0.15s',
        }}
        aria-label={collapsed ? 'Expandir' : 'Recolher'}
      >
        {collapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
