import api from './api'

export const dashboardApi = {
  resumo: () => api.get('/dashboard/resumo'),
}

export const comissionadosApi = {
  niveis:               (params?: any) => api.get('/pccv/comissionados/niveis', { params }),
  criarNivel:           (payload: any) => api.post('/pccv/comissionados/niveis', payload),
  atualizarNivel:       (id: string, payload: any) => api.put(`/pccv/comissionados/niveis/${id}`, payload),
  desativarNivel:       (id: string) => api.delete(`/pccv/comissionados/niveis/${id}`),

  gratificacoes:          (params?: any) => api.get('/pccv/comissionados/gratificacoes', { params }),
  criarGratificacao:      (payload: any) => api.post('/pccv/comissionados/gratificacoes', payload),
  atualizarGratificacao:  (id: string, payload: any) => api.put(`/pccv/comissionados/gratificacoes/${id}`, payload),
  desativarGratificacao:  (id: string) => api.delete(`/pccv/comissionados/gratificacoes/${id}`),
}

// ── Cargos / PCCV ─────────────────────────────────────────────────────────
// ⚠️ prefixo real no backend é /pccv, NÃO /cargos
export const cargosApi = {
  // Grupos ocupacionais
  grupos:           ()                              => api.get('/pccv/grupos'),
  criarGrupo:       (payload: any)                  => api.post('/pccv/grupos', payload),
  atualizarGrupo:   (id: string, payload: any)      => api.put(`/pccv/grupos/${id}`, payload),
  desativarGrupo:   (id: string)                    => api.delete(`/pccv/grupos/${id}`),

  // Cargos
  listar:           (params?: Record<string, string>) => api.get('/pccv', { params }),
  obter:            (id: string)                    => api.get(`/pccv/${id}`),
  criarCargo:       (payload: any)                  => api.post('/pccv', payload),
  atualizarCargo:   (id: string, payload: any)      => api.put(`/pccv/${id}`, payload),
  desativarCargo:   (id: string)                    => api.delete(`/pccv/${id}`),
  servidores:       (id: string)                    => api.get(`/pccv/${id}/servidores`),

  // Tabelas salariais
  tabelas:          ()                              => api.get('/pccv/tabelas'),
  criarTabela:      (payload: any)                  => api.post('/pccv/tabelas', payload),
  atualizarTabela:  (id: string, payload: any)      => api.put(`/pccv/tabelas/${id}`, payload),
  removerTabela:    (id: string)                    => api.delete(`/pccv/tabelas/${id}`),
  matriz:           (tabelaId: string)              => api.get(`/pccv/tabelas/${tabelaId}/matriz`, { params: { _t: Date.now() } }),
  niveis:           (tabelaId: string)              => api.get(`/pccv/tabelas/${tabelaId}/niveis`),
  criarNivelTabela: (tabelaId: string, payload: any) => api.post(`/pccv/tabelas/${tabelaId}/niveis`, payload),
  atualizarNivelTabela: (tabelaId: string, id: string, payload: any) => api.put(`/pccv/tabelas/${tabelaId}/niveis/${id}`, payload),
  removerNivelTabela:   (tabelaId: string, id: string) => api.delete(`/pccv/tabelas/${tabelaId}/niveis/${id}`),

  // Lotações
  lotacoes:         (params?: Record<string, string>) => api.get('/pccv/lotacoes', { params }),
  criarLotacao:     (payload: any)                  => api.post('/pccv/lotacoes', payload),
  atualizarLotacao: (id: string, payload: any)      => api.put(`/pccv/lotacoes/${id}`, payload),
  desativarLotacao: (id: string)                    => api.delete(`/pccv/lotacoes/${id}`),
}

// ── Férias ────────────────────────────────────────────────────────────────
// Backend: ferias/periodos/:servidorId | ferias/agendar | ferias/:id/aprovar | ferias/vencendo
export const feriasApi = {
  periodos:  (servidorId: string)         => api.get(`/ferias/periodos/${servidorId}`),
  vencendo:  ()                           => api.get('/ferias/vencendo'),
  agendar:   (payload: {
    servidorId: string
    dataInicio: string
    dias: number
    tipoAbono?: boolean
  })                                      => api.post('/ferias/agendar', payload),
  aprovar:   (id: string)                 => api.put(`/ferias/${id}/aprovar`),
  // lista geral filtrada
  listar:    (params?: Record<string, string>) => api.get('/ferias/vencendo', { params }),
}

// ── Licenças ──────────────────────────────────────────────────────────────
// Backend: licencas/ | licencas/:servidorId | licencas/:id/aprovar | licencas/:id/encerrar
export const licencasApi = {
  listar:    (params?: Record<string, string>) => api.get('/licencas', { params }),
  porServidor: (servidorId: string)       => api.get(`/licencas/${servidorId}`),
  criar:     (payload: {
    servidorId: string
    tipo: string
    dataInicio: string
    dataFim: string
    cid?: string
    observacao?: string
  })                                      => api.post('/licencas', payload),
  aprovar:   (id: string)                 => api.put(`/licencas/${id}/aprovar`),
  encerrar:  (id: string)                 => api.put(`/licencas/${id}/encerrar`),
}

// ── Concurso ──────────────────────────────────────────────────────────────
// Backend: concursos/ | concursos/:id/candidatos | concursos/:id/convocacao
//          concursos/:id/posse | concursos/estagio/em-andamento
export const concursoApi = {
  listar:       (params?: Record<string, string>) => api.get('/concursos', { params }),
  obter:        (id: string)              => api.get(`/concursos/${id}`),
  candidatos:   (id: string)              => api.get(`/concursos/${id}/candidatos`),
  addCandidato: (id: string, payload: any) => api.post(`/concursos/${id}/candidatos`, payload),
  convocacao:   (id: string, payload: any) => api.post(`/concursos/${id}/convocacao`, payload),
  posse:        (id: string, payload: { candidatoId: string; dataPosse: string }) =>
    api.post(`/concursos/${id}/posse`, payload),
  estagioAndamento: ()                    => api.get('/concursos/estagio/em-andamento'),
  criar:        (payload: any)            => api.post('/concursos', payload),
}

// ── Aposentadoria ─────────────────────────────────────────────────────────
// Backend: aposentadoria/simulador/:id | aposentadoria/pedido
//          aposentadoria/:id/conceder | aposentadoria/pensionistas
export const aposentadoriaApi = {
  simulador:   (servidorId: string)       => api.get(`/aposentadoria/simulador/${servidorId}`),
  pensionistas: ()                        => api.get('/aposentadoria/pensionistas'),
  pedido:      (payload: {
    servidorId: string
    tipo: string
    dataEfetivacao: string
    observacao?: string
  })                                      => api.post('/aposentadoria/pedido', payload),
  conceder:    (id: string)               => api.put(`/aposentadoria/${id}/conceder`),
  // lista aptos (calculado pelo simulador de todos os servidores)
  listarAptos: ()                         => api.get('/aposentadoria/pensionistas'),
}

// ── Disciplinar ───────────────────────────────────────────────────────────
// Backend: disciplinar/ GET,POST | disciplinar/:id/penalidade PUT
export const disciplinarApi = {
  listar:     (params?: Record<string, string>) => api.get('/disciplinar', { params }),
  obter:      (id: string)                => api.get(`/disciplinar/${id}`),
  instaurar:  (payload: {
    servidorId: string
    tipo: string
    objeto: string
    comissao?: string[]
  })                                      => api.post('/disciplinar', payload),
  aplicarPenalidade: (id: string, payload: { penalidade: string; observacao: string }) =>
    api.put(`/disciplinar/${id}/penalidade`, payload),
}

// ── Assinatura ────────────────────────────────────────────────────────────
// Backend: assinatura/pendentes | assinatura/ GET,POST | assinatura/:id/assinar POST
export const assinaturaApi = {
  pendentes:  ()                          => api.get('/assinatura/pendentes'),
  listar:     (params?: Record<string, string>) => api.get('/assinatura', { params }),
  obter:      (id: string)                => api.get(`/assinatura/${id}`),
  criar:      (payload: any)              => api.post('/assinatura', payload),
  assinar:    (id: string)                => api.post(`/assinatura/${id}/assinar`),
}

// ── Notificações ──────────────────────────────────────────────────────────
// Backend: notificacoes/ | notificacoes/nao-lidas | notificacoes/:id/lida PUT
export const notificacoesApi = {
  listar:        (params?: { lida?: boolean; limit?: number }) =>
    api.get('/notificacoes', { params }),
  naoLidas:      ()                       => api.get('/notificacoes/nao-lidas'),
  marcarLida:    (id: string)             => api.put(`/notificacoes/${id}/lida`),
  marcarTodasLidas: ()                    => api.put('/notificacoes/todas-lidas'),
}

// ── Transparência Pública ─────────────────────────────────────────────────
// ⚠️ prefixo real no backend é /public, NÃO /transparencia, e NÃO requer JWT
export const transparenciaApi = {
  remuneracao:   (params?: Record<string, string>) =>
    api.get('/public/remuneracao', { params }),
  quadroPessoal: (params?: Record<string, string>) =>
    api.get('/public/quadro-pessoal', { params }),
  exportar:      (params?: Record<string, string>) =>
    api.get('/public/exportar', { params }),
}
