// Ponto de entrada do motor do Rastro.
export { executar, avaliarExpressao } from './interpretador.js';
export { analisar, analisarExpressao } from './sintatico.js';
export { gerarVariacao, gerarVariacaoBug, criarRng, novaSemente } from './gerador.js';
export { reprPy, strPy, nomeTipo, iguais, PyFloat } from './valores.js';
export { ErroPython } from './erros.js';
