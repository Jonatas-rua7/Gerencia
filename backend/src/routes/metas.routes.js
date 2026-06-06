const { Router } = require('express');
const ctrl = require('../controllers/metas.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/', ctrl.listar);
router.post('/', ctrl.criar);
router.post('/:id/aportes', ctrl.registrarAporte);
router.delete('/:id', ctrl.excluir);
module.exports = router;
