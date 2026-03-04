const TransparenciaService = require('./transparencia.service');
const { ok, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class TransparenciaController {
  constructor() {
    this.service = new TransparenciaService();
    Object.getOwnPropertyNames(TransparenciaController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }

  async remuneracao(req, res, next) {
    try {
      const { cnpj, competencia } = req.query;
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.getRemuneracao({ cnpj, competencia, skip, take });
      paginate(res, dados, total, page, limit);
    } catch (err) { next(err); }
  }

  async exportar(req, res, next) {
    try {
      const { cnpj, competencia, formato } = req.query;
      const { buffer, contentType, filename } = await this.service.exportar({ cnpj, competencia, formato });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);
    } catch (err) { next(err); }
  }

  async quadroPessoal(req, res, next) {
    try {
      const { cnpj } = req.query;
      const dados = await this.service.getQuadroPessoal(cnpj);
      ok(res, dados);
    } catch (err) { next(err); }
  }
}

module.exports = TransparenciaController;
