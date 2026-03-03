import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Toaster } from '@/components/ui/toaster'

// Públicas
import LoginPage from '@/pages/LoginPage'

// Layout / dashboard
import DashboardPage from '@/pages/DashboardPage'

// ✅ Servidores
import ServidoresPage from '@/pages/servidores/ServidoresPage'
import ServidorDetalhe from '@/pages/servidores/ServidorDetalhe'
import NovoServidorPage from '@/pages/servidores/NovoServidorPage'
import EditarServidorPage from '@/pages/servidores/EditarServidorPage'

// ✅ Folha
import FolhaPage from '@/pages/folha/FolhaPage'
import HoleritePage from '@/pages/folha/HoleritePage'
import HoleritesPorFolhaPage from '@/pages/folha/HoleritesPorFolhaPage'

// ✅ Progressão
import ProgressaoPage from '@/pages/progressao/ProgressaoPage'

// ✅ Cargos
import CargosPage from '@/pages/cargos/CargosPage'

// ✅ Ponto
import PontoPage from '@/pages/ponto/PontoPage'
import BaterPontoPage from '@/pages/ponto/BaterPontoPage'

// ✅ Férias
import FeriasPage from '@/pages/ferias/FeriasPage'

// ✅ Licenças
import LicencasPage from '@/pages/licencas/LicencasPage'

// ✅ Concurso
import ConcursoPage from '@/pages/concurso/ConcursoPage'

// ✅ Aposentadoria
import AposentadoriaPage from '@/pages/aposentadoria/AposentadoriaPage'

// ✅ Disciplinar
import DisciplinarPage from '@/pages/disciplinar/DisciplinarPage'

// ✅ Assinatura
import AssinaturaPage from '@/pages/assinatura/AssinaturaPage'

// ✅ Notificações
import NotificacoesPage from '@/pages/notificacoes/NotificacoesPage'

// ✅ Transparência
import TransparenciaPage from '@/pages/transparencia/TransparenciaPage'

// ✅ Relatórios
import RelatoriosPage from '@/pages/relatorios/RelatoriosPage'

// ✅ Cadastros Auxiliares
import CadastrosAuxiliaresPage from '@/pages/cadastros/CadastrosAuxiliaresPage'

// ✅ Configurações
import ConfiguracoesPage from '@/pages/configuracoes/ConfiguracoesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />


        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
         <Route path="/bater-ponto" element={<BaterPontoPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Servidores */}
            <Route path="/servidores" element={<ServidoresPage />} />
            <Route path="/servidores/novo" element={<NovoServidorPage />} />
            <Route path="/servidores/:id" element={<ServidorDetalhe />} />
            <Route path="/servidores/:id/editar" element={<EditarServidorPage />} />
           
            {/* Folha */}
            <Route path="/folha" element={<FolhaPage />} />
            <Route path="/folha/:folhaId/holerites" element={<HoleritesPorFolhaPage />} />
            <Route path="/folha/holerite/:servidorId/:competencia" element={<HoleritePage />} />

            {/* Demais módulos */}
            <Route path="/progressao" element={<ProgressaoPage />} />
            <Route path="/cargos" element={<CargosPage />} />
            <Route path="/ponto" element={<PontoPage />} />

            <Route path="/ferias" element={<FeriasPage />} />
            <Route path="/licencas" element={<LicencasPage />} />
            <Route path="/concurso" element={<ConcursoPage />} />
            <Route path="/aposentadoria" element={<AposentadoriaPage />} />
            <Route path="/disciplinar" element={<DisciplinarPage />} />
            <Route path="/assinatura" element={<AssinaturaPage />} />
            <Route path="/notificacoes" element={<NotificacoesPage />} />
            <Route path="/transparencia" element={<TransparenciaPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/cadastros" element={<CadastrosAuxiliaresPage />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
