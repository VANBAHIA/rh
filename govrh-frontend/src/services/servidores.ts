import api from './api'

// ─────────────────────────────────────────────────────────────
// Todos os endpoints baseados em servidores.routes.js real
// ─────────────────────────────────────────────────────────────

export const servidoresApi = {

  // ── Lista / CRUD principal ────────────────────────────────
  listar: (params?: {
    page?: number; limit?: number; q?: string
    situacao?: string; regime?: string; lotacaoId?: string; cargoId?: string
  }) => api.get('/servidores', { params }),

  obter: (id: string) => api.get(`/servidores/${id}`),
  criar: (payload: any) => api.post('/servidores', payload),
  atualizar: (id: string, payload: any) => api.put(`/servidores/${id}`, payload),
  desativar: (id: string, payload: { motivo: string; dataEncerramento?: string; tipoAlteracao?: string }) =>
    api.delete(`/servidores/${id}`, { data: payload }),
  excluir: (id: string) => api.delete(`/servidores/${id}/excluir`),
  exportar: (params?: Record<string, string>) =>
    api.get('/servidores/exportar', { params, responseType: 'blob' }),

  // ── Vínculos funcionais ───────────────────────────────────
  historico: (id: string) => api.get(`/servidores/${id}/historico`),
  criarVinculo: (id: string, payload: any) => api.post(`/servidores/${id}/vinculos`, payload),
  atualizarVinculo: (id: string, payload: any) => api.patch(`/servidores/${id}/vinculos/atual`, payload),
  corrigirVinculo: (id: string, vinculoId: string, payload: any) =>
    api.patch(`/servidores/${id}/vinculos/${vinculoId}/corrigir`, payload),

  // ── Contatos ─────────────────────────────────────────────
  listarContatos: (id: string) => api.get(`/servidores/${id}/contatos`),
  criarContato: (id: string, payload: { tipo: string; valor: string; principal?: boolean }) =>
    api.post(`/servidores/${id}/contatos`, payload),
  atualizarContato: (id: string, contatoId: string, payload: any) =>
    api.put(`/servidores/${id}/contatos/${contatoId}`, payload),
  removerContato: (id: string, contatoId: string) =>
    api.delete(`/servidores/${id}/contatos/${contatoId}`),

  // ── Endereços ────────────────────────────────────────────
  listarEnderecos: (id: string) => api.get(`/servidores/${id}/enderecos`),
  criarEndereco: (id: string, payload: any) => api.post(`/servidores/${id}/enderecos`, payload),
  atualizarEndereco: (id: string, enderecoId: string, payload: any) =>
    api.put(`/servidores/${id}/enderecos/${enderecoId}`, payload),
  removerEndereco: (id: string, enderecoId: string) =>
    api.delete(`/servidores/${id}/enderecos/${enderecoId}`),

  // ── Escala de trabalho (catálogo) ────────────────────────────
  listarEscalas: (params?: { ativo?: boolean }) => api.get('/ponto/escalas', { params }),
  criarEscala: (payload: any) => api.post('/ponto/escalas', payload),
  atualizarEscala: (id: string, payload: any) => api.put(`/ponto/escalas/${id}`, payload),
  excluirEscala: (id: string) => api.delete(`/ponto/escalas/${id}`),
  obterEscala: (id: string) => api.get(`/servidores/${id}/escala`),
  historicoEscalas: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/servidores/${id}/escala/historico`, { params }),
  vincularEscala: (id: string, payload: { escalaId: string; dataInicio: string; motivoAlteracao?: string }) =>
    api.post(`/servidores/${id}/escala`, payload),

  // ── Sub-recursos ─────────────────────────────────────────
  documentos: (id: string) => api.get(`/servidores/${id}/documentos`),
  uploadDocumento: (id: string, payload: any) => api.post(`/servidores/${id}/documentos`, payload),
  progressoes: (id: string) => api.get(`/servidores/${id}/progressoes`),
  extrato: (id: string) => api.get(`/servidores/${id}/extrato`),
  uploadBiometriaFacial: (id: string, formData: FormData) =>
    api.post(`/servidores/${id}/biometria-facial`, formData),
}
