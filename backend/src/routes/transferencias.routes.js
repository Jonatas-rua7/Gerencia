const { Router } = require('express');
const ctrl = require('../controllers/transferencias.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.post('/', ctrl.registrar);
module.exports = router;
