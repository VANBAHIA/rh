/**
 * services/facial.ts
 *
 * Serviço de identificação facial.
 *
 * Contrato do backend:
 *   POST   /facial/identify              → identifica rosto via frame
 *   POST   /facial/cadastrar/:servidorId → cadastra/atualiza biometria
 *   DELETE /facial/cadastrar/:servidorId → remove biometria (LGPD)
 */

import api from './api'

export const facialApi = {
  /**
   * Envia um frame (Blob JPEG) para o backend identificar o servidor.
   * Retorna a matrícula e nome do servidor reconhecido.
   */
  identify: (frame: Blob, tenantId: string) => {
    const form = new FormData()
    form.append('frame', frame, 'frame.jpg')

    return api.post<{
      data: {
        matricula: string
        nome?: string
        confianca?: number // 0-1
      }
    }>('/facial/identify', form, {
      // ⚠️ Não setar Content-Type manualmente — Axios define o boundary correto
      headers: { 'x-tenant-id': tenantId },
    })
  },

  /**
   * Cadastra/atualiza o rosto de um servidor.
   * @param servidorId - ID do servidor (não a matrícula!)
   * @param foto       - imagem Blob (JPEG ou PNG)
   */
  cadastrar: (servidorId: string, foto: Blob) => {
    const form = new FormData()
    form.append('foto', foto, 'foto.jpg')

    // ✅ servidorId vai na URL, conforme facial.routes.js: POST /cadastrar/:servidorId
    return api.post(`/facial/cadastrar/${servidorId}`, form)
  },

  /**
   * Remove os dados biométricos de um servidor (LGPD - direito ao esquecimento).
   * @param servidorId - ID do servidor
   */
  remover: (servidorId: string) =>
    api.delete(`/facial/cadastrar/${servidorId}`),
}
