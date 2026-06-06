const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();

router.post('/cadastro', ctrl.cadastro);
router.post('/login', ctrl.login);
router.post('/recuperar-senha', ctrl.recuperarSenha);
router.get('/me', authMiddleware, ctrl.me);

module.exports = router;
