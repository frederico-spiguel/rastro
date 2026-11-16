// Analisador sintático: tokens -> árvore (AST).
import { ErroPython } from './erros.js';
import { tokenizar } from './lexico.js';
import { PyFloat, criarInt } from './valores.js';

const OPS_ATRIB = ['+=', '-=', '*=', '/=', '//=', '%=', '**='];
const OPS_COMP = ['==', '!=', '<', '>', '<=', '>='];

export function analisar(fonte) {
  return new Parser(tokenizar(fonte)).programa();
}

export function analisarExpressao(texto) {
  const p = new Parser(tokenizar(texto));
  const e = p.expressao();
  p.esperar('NEWLINE', undefined, 'expressão inválida');
  p.esperar('EOF', undefined, 'esperava uma única expressão');
  return e;
}

class Parser {
  constructor(tokens) {
    this.t = tokens;
    this.i = 0;
  }
  get atual() { return this.t[this.i]; }
  ver(tipo, v) {
    const k = this.atual;
    return k.t === tipo && (v === undefined || k.v === v);
  }
  aceitar(tipo, v) {
    return this.ver(tipo, v) ? this.t[this.i++] : null;
  }
  esperar(tipo, v, msg) {
    const k = this.aceitar(tipo, v);
    if (!k) throw this.erro(msg);
    return k;
  }
  erro(msg, tok = this.atual) {
    return new ErroPython('SyntaxError', msg, tok.linha);
  }

  programa() {
    const corpo = [];
    while (!this.ver('EOF')) corpo.push(this.comando());
    return corpo;
  }

  bloco(nome) {
    this.esperar('NEWLINE', undefined, `depois de '${nome}:' o bloco deve começar na linha seguinte`);
    this.esperar('INDENT', undefined, `esperava um bloco indentado depois de '${nome}:'`);
    const corpo = [];
    while (!this.ver('DEDENT') && !this.ver('EOF')) corpo.push(this.comando());
    this.aceitar('DEDENT');
    return corpo;
  }

  doisPontos(nome) {
    this.esperar('OP', ':', `faltou ':' no fim da linha do '${nome}'`);
  }

  fimLinha() {
    if (this.ver('OP', ',')) throw this.erro('vírgulas fora de listas não são usadas neste jogo');
    this.esperar('NEWLINE', undefined, 'esperava o fim da linha');
  }

  comando() {
    const tok = this.atual;
    if (tok.t === 'INDENT') throw this.erro('indentação inesperada');
    if (tok.t === 'KW') {
      switch (tok.v) {
        case 'if': return this.se();
        case 'while': return this.enquanto();
        case 'for': return this.para();
        case 'break':
        case 'continue':
        case 'pass':
          this.i++;
          this.fimLinha();
          return { tipo: tok.v, linha: tok.linha };
        case 'elif':
        case 'else':
          throw this.erro(`'${tok.v}' sem um 'if' correspondente`);
        default:
          break;
      }
    }
    return this.simples();
  }

  se() {
    const linha = this.atual.linha;
    this.i++;
    const ramos = [];
    const cond = this.expressao();
    this.doisPontos('if');
    ramos.push({ cond, corpo: this.bloco('if'), linha });
    while (this.ver('KW', 'elif')) {
      const l = this.atual.linha;
      this.i++;
      const c = this.expressao();
      this.doisPontos('elif');
      ramos.push({ cond: c, corpo: this.bloco('elif'), linha: l });
    }
    let senao = null;
    if (this.aceitar('KW', 'else')) {
      this.doisPontos('else');
      senao = this.bloco('else');
    }
    return { tipo: 'se', ramos, senao, linha };
  }

  enquanto() {
    const linha = this.atual.linha;
    this.i++;
    const cond = this.expressao();
    this.doisPontos('while');
    return { tipo: 'enquanto', cond, corpo: this.bloco('while'), linha };
  }

  para() {
    const linha = this.atual.linha;
    this.i++;
    const v = this.esperar('NOME', undefined, "depois de 'for' deve vir o nome de uma variável");
    if (this.ver('OP', ',')) throw this.erro('use só uma variável no for');
    this.esperar('KW', 'in', "faltou 'in' no for");
    const iter = this.expressao();
    this.doisPontos('for');
    return { tipo: 'para', variavel: v.v, iter, corpo: this.bloco('for'), linha };
  }

  simples() {
    const linha = this.atual.linha;
    const e = this.expressao();
    if (this.aceitar('OP', '=')) {
      this.checarAlvo(e);
      const valor = this.expressao();
      if (this.ver('OP', '=')) throw this.erro('faça uma atribuição por linha');
      this.fimLinha();
      return { tipo: 'atrib', alvo: e, valor, linha };
    }
    const op = OPS_ATRIB.find((o) => this.ver('OP', o));
    if (op) {
      this.i++;
      this.checarAlvo(e);
      const valor = this.expressao();
      this.fimLinha();
      return { tipo: 'atribAum', op: op.slice(0, -1), alvo: e, valor, linha };
    }
    this.fimLinha();
    return { tipo: 'expr', expr: e, linha };
  }

  checarAlvo(e) {
    if (e.tipo !== 'nome' && e.tipo !== 'indice') {
      throw this.erro('só dá para atribuir a uma variável ou a uma posição de lista');
    }
  }

  // ---------- expressões (da menor para a maior precedência) ----------
  expressao() { return this.ou(); }

  ou() {
    let a = this.e();
    while (this.aceitar('KW', 'or')) a = { tipo: 'ou', a, b: this.e() };
    return a;
  }

  e() {
    let a = this.nao();
    while (this.aceitar('KW', 'and')) a = { tipo: 'e', a, b: this.nao() };
    return a;
  }

  nao() {
    if (this.aceitar('KW', 'not')) return { tipo: 'nao', a: this.nao() };
    return this.comparacao();
  }

  comparacao() {
    const primeiro = this.soma();
    const ops = [];
    const termos = [primeiro];
    for (;;) {
      let op = null;
      const k = this.atual;
      if (k.t === 'OP' && OPS_COMP.includes(k.v)) { op = k.v; this.i++; }
      else if (this.ver('KW', 'in')) { op = 'in'; this.i++; }
      else if (this.ver('KW', 'not') && this.t[this.i + 1].t === 'KW' && this.t[this.i + 1].v === 'in') {
        op = 'not in';
        this.i += 2;
      }
      if (!op) break;
      ops.push(op);
      termos.push(this.soma());
    }
    return ops.length ? { tipo: 'comp', ops, termos } : primeiro;
  }

  soma() {
    let a = this.termo();
    for (;;) {
      const k = this.atual;
      if (k.t === 'OP' && (k.v === '+' || k.v === '-')) {
        this.i++;
        a = { tipo: 'bin', op: k.v, a, b: this.termo() };
      } else return a;
    }
  }

  termo() {
    let a = this.unario();
    for (;;) {
      const k = this.atual;
      if (k.t === 'OP' && ['*', '/', '//', '%'].includes(k.v)) {
        this.i++;
        a = { tipo: 'bin', op: k.v, a, b: this.unario() };
      } else return a;
    }
  }

  unario() {
    const k = this.atual;
    if (k.t === 'OP' && (k.v === '-' || k.v === '+')) {
      this.i++;
      return { tipo: 'unario', op: k.v, a: this.unario() };
    }
    return this.potencia();
  }

  potencia() {
    const base = this.posfixo();
    if (this.aceitar('OP', '**')) return { tipo: 'bin', op: '**', a: base, b: this.unario() };
    return base;
  }

  posfixo() {
    let e = this.atomo();
    for (;;) {
      if (this.aceitar('OP', '(')) {
        const args = [];
        const nomeados = {};
        while (!this.ver('OP', ')')) {
          if (this.ver('NOME') && this.t[this.i + 1].t === 'OP' && this.t[this.i + 1].v === '=') {
            const nome = this.atual.v;
            this.i += 2;
            nomeados[nome] = this.expressao();
          } else {
            if (Object.keys(nomeados).length) throw this.erro('argumento sem nome depois de argumento com nome');
            args.push(this.expressao());
          }
          if (!this.aceitar('OP', ',')) break;
        }
        this.esperar('OP', ')', "faltou fechar o parêntese ')'");
        e = { tipo: 'chamada', func: e, args, nomeados };
      } else if (this.aceitar('OP', '[')) {
        const idx = this.expressao();
        if (this.ver('OP', ':')) throw this.erro('fatias (lista[a:b]) não são usadas neste jogo');
        this.esperar('OP', ']', "faltou fechar o colchete ']'");
        e = { tipo: 'indice', obj: e, idx };
      } else if (this.aceitar('OP', '.')) {
        const nome = this.esperar('NOME', undefined, "esperava o nome de um método depois de '.'");
        e = { tipo: 'atributo', obj: e, nome: nome.v };
      } else {
        return e;
      }
    }
  }

  atomo() {
    const k = this.atual;
    if (k.t === 'NUM') {
      this.i++;
      return { tipo: 'const', v: k.real ? new PyFloat(k.v) : criarIntLiteral(k, this) };
    }
    if (k.t === 'STR') {
      this.i++;
      return { tipo: 'const', v: k.v };
    }
    if (k.t === 'KW') {
      if (k.v === 'True' || k.v === 'False') { this.i++; return { tipo: 'const', v: k.v === 'True' }; }
      if (k.v === 'None') { this.i++; return { tipo: 'const', v: null }; }
    }
    if (k.t === 'NOME') {
      this.i++;
      return { tipo: 'nome', nome: k.v };
    }
    if (this.aceitar('OP', '(')) {
      const e = this.expressao();
      if (this.ver('OP', ',')) throw this.erro('tuplas não são usadas neste jogo');
      this.esperar('OP', ')', "faltou fechar o parêntese ')'");
      return e;
    }
    if (this.aceitar('OP', '[')) {
      const itens = [];
      while (!this.ver('OP', ']')) {
        itens.push(this.expressao());
        if (this.ver('KW', 'for')) throw this.erro('compreensões de lista não são usadas neste jogo');
        if (!this.aceitar('OP', ',')) break;
      }
      this.esperar('OP', ']', "faltou fechar o colchete ']'");
      return { tipo: 'lista', itens };
    }
    if (k.t === 'NEWLINE' || k.t === 'EOF') throw this.erro('a linha terminou antes do esperado');
    throw this.erro(`não esperava '${k.v ?? k.t}' aqui`);
  }
}

function criarIntLiteral(tok, parser) {
  try {
    return criarInt(tok.v);
  } catch {
    throw parser.erro('número grande demais para este jogo', tok);
  }
}
