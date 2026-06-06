const { Router } = require('express');
const ctrl = require('../controllers/contas.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/', ctrl.listar);
router.post('/', ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.get('/caixinhas/listar', ctrl.listarCaixinhas);
router.post('/caixinhas', ctrl.criarCaixinha);
router.get('/compromissos/listar', ctrl.listarCompromissos);
module.exports = router;
