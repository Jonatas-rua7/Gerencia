const { Router } = require('express');
const ctrl = require('../controllers/relatorios.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/resultado-mensal', ctrl.resultadoMensal);
router.get('/gastos-categoria', ctrl.gastosCategoria);
router.get('/pendencias', ctrl.pendencias);
router.get('/saldo-previsto', ctrl.saldoPrevisto);
router.get('/fluxo-projetado', ctrl.fluxoProjetado);
module.exports = router;
