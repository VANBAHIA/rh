import api from './api'

export const pontoApi = {
  espelho: (servidorId: string, mes: string) =>
    api.get(`/ponto/espelho/${servidorId}/${mes}`),

  bancoHoras: (servidorId: string) =>
    api.get(`/ponto/banco-horas/${servidorId}`),

  pendencias: (params?: Record<string, string>) =>
    api.get('/ponto/pendencias', { params }),

  lancamento: (payload: {
    servidorId: string
    data: string
    entrada?: string
    saida?: string
    intervaloMin?: number
    justificativa?: string
  }) => api.post('/ponto/lancamento', payload),

  bater: (payload: { servidorId: string; data: string; hora: string }) =>
    api.post('/ponto/bater', payload),

  // Valida escala e horário ANTES de confirmar o ponto.
  // Retorna: { permitido, motivo?, mensagem?, tipoBatida?, horarioEsperado?, aviso? }
  validarBatida: (payload: { servidorId: string; data: string; hora: string }) =>
    api.post('/ponto/validar-batida', payload),

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
