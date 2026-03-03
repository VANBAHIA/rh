import api from './api'
import type {
  ServidorApto,
  SimulacaoProgressao,
  ProgressaoRegistro,
  LoteProgressaoPayload,
} from '@/types/progressao'

// ── Progressão Funcional ──────────────────────────────────────────────────
// Backend:
//   progressao/aptos                  GET
//   progressao/simulacao/:id          GET
//   progressao/horizontal             POST
//   progressao/vertical/titulacao     POST
//   progressao/enquadramento          POST
//   progressao/:id/aprovar            PUT
//   progressao/processar-lote         POST  ← era /progressao/lote no frontend (ERRADO)

export const progressaoApi = {
  aptos: (tipo?: string) =>
    api.get<{ data: ServidorApto[] }>('/progressao/aptos', { params: tipo ? { tipo } : {} }),

  simulacao: (servidorId: string) =>
    api.get<{ data: SimulacaoProgressao }>(`/progressao/simulacao/${servidorId}`),

  horizontal: (payload: { servidorId: string; dataEfetivacao: string; observacao?: string }) =>
    api.post<{ data: ProgressaoRegistro }>('/progressao/horizontal', payload),

  verticalTitulacao: (payload: {
    servidorId: string
    novoNivel: string
    dataEfetivacao: string
    titulacao: string
  }) => api.post<{ data: ProgressaoRegistro }>('/progressao/vertical/titulacao', payload),

  enquadramento: (payload: { servidorId: string; dataEfetivacao: string; observacao?: string }) =>
    api.post<{ data: ProgressaoRegistro }>('/progressao/enquadramento', payload),

  aprovar: (id: string) =>
    api.put<{ data: ProgressaoRegistro }>(`/progressao/${id}/aprovar`),

  // ⚠️ era /progressao/lote — corrigido para /progressao/processar-lote
  lote: (payload: LoteProgressaoPayload) =>
    api.post<{ data: { processados: number; erros: number } }>('/progressao/processar-lote', payload),

  historico: (params?: { page?: number; limit?: number; servidorId?: string }) =>
    api.get<{ data: ProgressaoRegistro[]; meta: { total: number; totalPages: number } }>(
      '/progressao/aptos',  // fallback — histórico real via servidores/:id/historico
      { params },
    ),
}
