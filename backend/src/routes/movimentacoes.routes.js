const { Router } = require('express');
const ctrl = require('../controllers/movimentacoes.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/', ctrl.listar);
router.post('/', ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.excluir);
router.post('/:id/duplicar', ctrl.duplicar);
module.exports = router;
