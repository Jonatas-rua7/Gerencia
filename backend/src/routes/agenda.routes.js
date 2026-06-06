const { Router } = require('express');
const ctrl = require('../controllers/agenda.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/', ctrl.listar);
router.post('/', ctrl.criar);
router.post('/parcelamento', ctrl.criarParcelamento);
router.post('/:id/realizar', ctrl.realizar);
router.post('/:id/cancelar', ctrl.cancelar);
module.exports = router;
