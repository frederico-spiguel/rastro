// Erro no estilo do Python: `tipo` usa o nome do Python (NameError, TypeError...)
// para podermos comparar com o Python real; `mensagem` vem em português para o jogador.
export class ErroPython extends Error {
  constructor(tipo, mensagem, linha = null) {
    super(`${tipo}: ${mensagem}`);
    this.tipo = tipo;
    this.mensagem = mensagem;
    this.linha = linha;
  }
}
