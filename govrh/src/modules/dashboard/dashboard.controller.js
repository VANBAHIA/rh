const DashboardService = require('./dashboard.service');
const { ok } = require('../../shared/utils/response');

class DashboardController {
  constructor() {
    this.service = new DashboardService();
    this.resumo = this.resumo.bind(this);
  }

  async resumo(req, res, next) {
    try {
      ok(res, await this.service.resumo(req.tenantId));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
