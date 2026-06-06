const { Router } = require('express');
const ctrl = require('../controllers/usuarios.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();
router.use(authMiddleware);
router.get('/perfil', ctrl.obterPerfil);
router.put('/perfil', ctrl.atualizarPerfil);
router.get('/clientes', ctrl.listarClientes);
router.post('/clientes', ctrl.criarCliente);
router.put('/clientes/:id', ctrl.atualizarCliente);
router.get('/fornecedores', ctrl.listarFornecedores);
router.post('/fornecedores', ctrl.criarFornecedor);
router.put('/fornecedores/:id', ctrl.atualizarFornecedor);
router.get('/servicos', ctrl.listarServicos);
router.post('/servicos', ctrl.criarServico);
router.put('/servicos/:id', ctrl.atualizarServico);
module.exports = router;
