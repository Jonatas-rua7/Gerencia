/**
 * Categorias padrão criadas no cadastro do usuário.
 * Cores alinhadas à identidade verde/dourada do Gerencia!
 */

const BASE = [
  { nome: 'Alimentação', tipo: 'saida', cor: '#D9A400' },
  { nome: 'Transporte', tipo: 'saida', cor: '#2F80ED' },
  { nome: 'Moradia', tipo: 'saida', cor: '#D64545' },
  { nome: 'Saúde', tipo: 'saida', cor: '#16A085' },
  { nome: 'Assinaturas', tipo: 'saida', cor: '#8E6B00' },
  { nome: 'Salário', tipo: 'entrada', cor: '#2E9E44' },
  { nome: 'Serviço prestado', tipo: 'entrada', cor: '#3FA600' },
  { nome: 'Outras entradas', tipo: 'entrada', cor: '#6B7280' },
  { nome: 'Outras saídas', tipo: 'saida', cor: '#6B7280' }
];

function obterCategoriasPadrao(tipoUso) {
  const lista = [...BASE];
  if (tipoUso === 'empresa') {
    lista.push(
      { nome: 'Fornecedores', tipo: 'saida', cor: '#C0392B' },
      { nome: 'Receita de vendas', tipo: 'entrada', cor: '#1B7F3A' }
    );
  }
  return lista;
}

module.exports = { obterCategoriasPadrao };
