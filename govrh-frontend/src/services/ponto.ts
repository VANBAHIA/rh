import api from './api'

// ── Ponto & Escalas ───────────────────────────────────────────────────────
// Backend:
//   ponto/escalas                     GET, POST
//   ponto/espelho/:servidorId/:mes    GET  ← era /ponto/resumo (ERRADO)
//   ponto/lancamento                  POST ← era /ponto/ocorrencias (ERRADO)
//   ponto/banco-horas/:servidorId     GET
//   ponto/pendencias                  GET

export const pontoApi = {
  // Espelho de ponto do servidor no mês (AAAA-MM)
  espelho: (servidorId: string, mes: string) =>
    api.get(`/ponto/espelho/${servidorId}/${mes}`),

  // Banco de horas
  bancoHoras: (servidorId: string) =>
    api.get(`/ponto/banco-horas/${servidorId}`),

  // Pendências para aprovação
  pendencias: (params?: Record<string, string>) =>
    api.get('/ponto/pendencias', { params }),

  // Lançamento de ponto (entrada/saída) – payload esperado pela API de cálculo completo
  lancamento: (payload: {
    servidorId: string
    data: string
    entrada?: string
    saida?: string
    intervaloMin?: number
    justificativa?: string
  }) => api.post('/ponto/lancamento', payload),

  // Batida simples utilizada pelo terminal de ponto
  bater: (payload: { servidorId: string; data: string; hora: string }) =>
    api.post('/ponto/bater', payload),

  // Escalas
  escalas: () => api.get('/ponto/escalas'),

  criarEscala: (payload: {
    nome: string
    tipo: string
    cargaHorariaSemanal: number
    diasSemana?: number[]
    turnos: any[]
  }) => api.post('/ponto/escalas', payload),

  updateEscala: (id: string, payload: {
    nome: string
    descricao?: string
    tipo: string
    cargaHorariaSemanal: number
    diasSemana?: number[]
    turnos: any[]
  }) => api.put(`/ponto/escalas/${id}`, payload),

  deleteEscala: (id: string) => api.delete(`/ponto/escalas/${id}`),
}
