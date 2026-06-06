const { Router } = require('express');
const ctrl = require('../controllers/assistente.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/sugerir-categoria', ctrl.sugerirCategoria);
router.post('/atualizar-atrasadas', ctrl.atualizarAtrasadas);
router.post('/verificar-saldo-previsto', ctrl.verificarSaldoPrevisto);
module.exports = router;
