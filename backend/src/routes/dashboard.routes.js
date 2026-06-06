const { Router } = require('express');
const ctrl = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/', ctrl.obterDashboard);
module.exports = router;
