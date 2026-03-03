import api from './api'
import type { FolhaResumo, Holerite, ProcessarFolhaPayload } from '@/types/folha'

// ── Folha de Pagamento ────────────────────────────────────────────────────
// Backend:
//   folha/verbas                      GET, POST
//   folha/config                      GET, PUT
//   folha/consignados/:servidorId     GET
//   folha/processar                   POST
//   folha/:competencia/:tipo          GET  ← lista a folha
//   folha/:competencia/:tipo/itens    GET  ← itens individuais
//   folha/:competencia/:tipo/fechar   POST
//   folha/:folhaId/itens              GET  ← itens por ID da folha
//   folha/holerite/:servidorId/:comp  GET

export const folhaApi = {
  listar: (params?: { competencia?: string; tipo?: string; status?: string }) =>
    api.get('/folha', { params }),

  obter: (competencia: string, tipo: string) =>
    api.get(`/folha/${competencia}/${tipo}`),

  itens: (competencia: string, tipo: string, params?: Record<string, string>) =>
    api.get(`/folha/${competencia}/${tipo}/itens`, { params }),

  itensPorId: (folhaId: string, params?: { search?: string; page?: number; limit?: number }) =>
    api.get(`/folha/id/${folhaId}/itens`, { params }),

  processar: (payload: ProcessarFolhaPayload) =>
    api.post('/folha/processar', payload),

  fechar: (competencia: string, tipo: string) =>
    api.post(`/folha/${competencia}/${tipo}/fechar`),

  holerite: (servidorId: string, competencia: string, tipo?: string) =>
    api.get(`/folha/holerite/${servidorId}/${competencia}`, { params: tipo ? { tipo } : undefined }),

  relatorioAnalitico: (competencia: string, tipo: string) =>
    api.get(`/folha/${competencia}/${tipo}/analitico`),

  relatorioSintetico: (competencia: string, tipo: string) =>
    api.get(`/folha/${competencia}/${tipo}/sintetico`),

  reprocessar: (competencia: string, tipo: string) =>
    api.post('/folha/processar', { competencia, tipo }),
  reprocessarServidor: (folhaId: string, servidorId: string) =>
    api.post(`/folha/${folhaId}/servidor/${servidorId}/reprocessar`),
  excluir: (competencia: string, tipo: string) =>
    api.delete(`/folha/${competencia}/${tipo}`),

  verbas: (params?: { tipo?: string; ativo?: string; q?: string }) =>
    api.get('/folha/verbas', { params }),
  criarVerba: (payload: any) => api.post('/folha/verbas', payload),
  atualizarVerba: (id: string, payload: any) => api.put(`/folha/verbas/${id}`, payload),
  desativarVerba: (id: string) => api.delete(`/folha/verbas/${id}`),

  config: () => api.get('/folha/config'),
  atualizarConfig: (payload: any) => api.put('/folha/config', payload),

  consignados: (servidorId: string) => api.get(`/folha/consignados/${servidorId}`),
  criarConsignado: (payload: any) => api.post('/folha/consignados', payload),
  atualizarConsignado: (id: string, payload: any) => api.put(`/folha/consignados/${id}`, payload),
  cancelarConsignado: (id: string) => api.delete(`/folha/consignados/${id}`),
}
