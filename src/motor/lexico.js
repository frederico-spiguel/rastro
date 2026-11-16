// Analisador léxico: transforma o texto em tokens, incluindo INDENT/DEDENT.
import { ErroPython } from './erros.js';

export const PALAVRAS = new Set([
  'if', 'elif', 'else', 'while', 'for', 'in', 'and', 'or', 'not',
  'True', 'False', 'None', 'break', 'continue', 'pass',
]);

// Palavras do Python que existem mas ficam fora do subconjunto do jogo.
const FORA_DO_SUBCONJUNTO = new Set([
  'def', 'class', 'import', 'from', 'return', 'lambda', 'try', 'except', 'finally',
  'with', 'as', 'yield', 'global', 'nonlocal', 'del', 'is', 'raise', 'assert',
  'async', 'await',
]);

const OPERADORES = [
  '//=', '**=', '**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=',
  '+', '-', '*', '/', '%', '<', '>', '=', '(', ')', '[', ']', ',', ':', '.',
];

const RE_NUMERO = /^(?:\d+\.\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+|\d+)/;
const RE_NOME = /^[\p{L}_][\p{L}\p{N}_]*/u;
const ESCAPES = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', 0: '\0' };

export function tokenizar(fonte) {
  const linhas = fonte.replace(/\r\n?/g, '\n').split('\n');
  const tokens = [];
  const pilha = [0];
  const erro = (msg, linha) => new ErroPython('SyntaxError', msg, linha);

  for (let i = 0; i < linhas.length; i++) {
    const linha = i + 1;
    const texto = linhas[i];
    const recuo = texto.match(/^[ \t]*/)[0];
    const resto = texto.slice(recuo.length);
    if (resto === '' || resto.startsWith('#')) continue;
    if (recuo.includes('\t')) throw erro('use espaços (não TAB) para indentar', linha);

    const n = recuo.length;
    if (n > pilha[pilha.length - 1]) {
      pilha.push(n);
      tokens.push({ t: 'INDENT', linha });
    } else {
      while (n < pilha[pilha.length - 1]) {
        pilha.pop();
        tokens.push({ t: 'DEDENT', linha });
      }
      if (n !== pilha[pilha.length - 1]) throw erro('indentação inconsistente', linha);
    }

    let pos = n;
    let profundidade = 0;
    while (pos < texto.length) {
      const c = texto[pos];
      if (c === ' ' || c === '\t') { pos++; continue; }
      if (c === '#') break;
      const resto2 = texto.slice(pos);

      let m = resto2.match(RE_NUMERO);
      if (m) {
        const s = m[0];
        const real = /[.eE]/.test(s);
        tokens.push({ t: 'NUM', v: real ? parseFloat(s) : parseInt(s, 10), real, linha });
        pos += s.length;
        if (RE_NOME.test(texto.slice(pos))) throw erro(`número mal escrito perto de '${s}'`, linha);
        continue;
      }

      m = resto2.match(RE_NOME);
      if (m) {
        const nome = m[0];
        if (FORA_DO_SUBCONJUNTO.has(nome)) {
          throw erro(`'${nome}' não faz parte do Python usado neste jogo`, linha);
        }
        tokens.push({ t: PALAVRAS.has(nome) ? 'KW' : 'NOME', v: nome, linha });
        pos += nome.length;
        continue;
      }

      if (c === '"' || c === "'") {
        let j = pos + 1;
        let valor = '';
        while (j < texto.length && texto[j] !== c) {
          if (texto[j] === '\\') {
            const prox = texto[j + 1];
            if (prox in ESCAPES) valor += ESCAPES[prox];
            else valor += `\\${prox ?? ''}`;
            j += 2;
          } else {
            valor += texto[j++];
          }
        }
        if (j >= texto.length) throw erro('texto (string) sem aspas de fechamento', linha);
        tokens.push({ t: 'STR', v: valor, linha });
        pos = j + 1;
        continue;
      }

      const op = OPERADORES.find((o) => resto2.startsWith(o));
      if (!op) throw erro(`caractere inesperado '${c}'`, linha);
      if (op === '(' || op === '[') profundidade++;
      if (op === ')' || op === ']') profundidade--;
      tokens.push({ t: 'OP', v: op, linha });
      pos += op.length;
    }
    if (profundidade > 0) throw erro('parêntese ou colchete aberto e não fechado nesta linha', linha);
    tokens.push({ t: 'NEWLINE', linha });
  }

  const ultima = linhas.length;
  while (pilha.length > 1) {
    pilha.pop();
    tokens.push({ t: 'DEDENT', linha: ultima });
  }
  tokens.push({ t: 'EOF', linha: ultima });
  return tokens;
}
