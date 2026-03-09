const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const DashboardController = require('./dashboard.controller');

const router = Router();
const ctrl = new DashboardController();

router.use(authenticate);

router.get('/resumo', authorize('servidores', 'read'), ctrl.resumo);

module.exports = router;
