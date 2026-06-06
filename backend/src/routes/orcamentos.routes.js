const { Router } = require('express');
const ctrl = require('../controllers/orcamentos.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/', ctrl.listar);
router.post('/', ctrl.salvar);
router.delete('/:id', ctrl.excluir);
module.exports = router;
