// Interpretador do Python simplificado.
// executar() devolve o HISTÓRICO DE ESTADOS: um passo por linha executada, com o valor
// de todas as variáveis DEPOIS daquela linha. Esse histórico é o gabarito do jogo.
//
// A ordem dos passos imita os eventos de linha do Python real (sys.settrace):
//   - atribuição / print: um passo depois de executar a linha;
//   - if / elif: um passo ao avaliar a condição (o 'else:' não gera passo);
//   - while: um passo a cada avaliação da condição (inclusive a última, falsa);
//   - for: um passo a cada item (variável já atualizada) e um passo final quando acaba.
import { ErroPython } from './erros.js';
import { analisar, analisarExpressao } from './sintatico.js';
import {
  PyFloat, PyRange, Embutida,
  ehFloat, ehBool, ehNum, ehStr, ehLista, ehInteiroLike,
  num, nomeTipo, criarInt, reprPy, strPy, verdadeiro, iguais, copiaProfunda,
} from './valores.js';

const MAX_TAMANHO = 10000; // limite para textos e listas criados com * e +

const ehPrint = (e) => e.tipo === 'chamada' && e.func.tipo === 'nome' && e.func.nome === 'print';

class Interrupcao {
  constructor(tipo) { this.tipo = tipo; }
}

export function executar(fonte, opcoes = {}) {
  const res = { ok: true, passos: [], saida: '', erro: null };
  let ast;
  try {
    ast = analisar(fonte);
  } catch (e) {
    if (!(e instanceof ErroPython)) throw e;
    res.ok = false;
    res.erro = { tipo: e.tipo, mensagem: e.mensagem, linha: e.linha };
    return res;
  }
  const m = new Maquina(res, opcoes);
  try {
    m.executarBloco(ast);
  } catch (e) {
    if (!(e instanceof ErroPython)) throw e;
    res.ok = false;
    res.erro = { tipo: e.tipo, mensagem: e.mensagem, linha: e.linha ?? m.linha };
  }
  return res;
}

// Avalia uma expressão isolada com variáveis dadas (usado nas condições do gerador).
export function avaliarExpressao(texto, variaveis = {}) {
  const m = new Maquina({ passos: [], saida: '' }, {});
  for (const [k, v] of Object.entries(variaveis)) m.vars.set(k, v);
  return m.avaliar(analisarExpressao(texto));
}

class Maquina {
  constructor(res, { entradas = [], maxPassos = 2000 } = {}) {
    this.res = res;
    this.entradas = entradas.map(String);
    this.maxPassos = maxPassos;
    this.vars = new Map();
    this.saidaPasso = '';
    this.linha = null;
    this.embutidas = criarEmbutidas(this);
  }

  escrever(texto) {
    this.saidaPasso += texto;
    this.res.saida += texto;
    if (this.res.saida.length > 100000) {
      throw new ErroPython('LimiteDoJogo', 'o programa escreveu texto demais');
    }
  }

  passo(linha, extra = {}) {
    const vars = {};
    for (const [k, v] of this.vars) vars[k] = copiaProfunda(v);
    this.res.passos.push({ linha, vars, saida: this.saidaPasso, ...extra });
    this.saidaPasso = '';
    if (this.res.passos.length > this.maxPassos) {
      throw new ErroPython('LimiteDoJogo', `o programa passou de ${this.maxPassos} passos (laço infinito?)`, linha);
    }
  }

  executarBloco(comandos) {
    for (const c of comandos) this.executarComando(c);
  }

  executarComando(c) {
    this.linha = c.linha;
    switch (c.tipo) {
      case 'atrib':
        this.atribuir(c.alvo, this.avaliar(c.valor));
        this.passo(c.linha, { comando: 'atribuicao' });
        return;
      case 'atribAum':
        this.atribuicaoAumentada(c);
        this.passo(c.linha, { comando: 'atribuicao' });
        return;
      case 'expr':
        this.avaliar(c.expr);
        this.passo(c.linha, { comando: ehPrint(c.expr) ? 'print' : 'expressao' });
        return;
      case 'pass':
        this.passo(c.linha, { comando: 'pass' });
        return;
      case 'break':
      case 'continue':
        this.passo(c.linha, { comando: c.tipo });
        throw new Interrupcao(c.tipo);
      case 'se':
        for (const [k, ramo] of c.ramos.entries()) {
          this.linha = ramo.linha;
          const r = verdadeiro(this.avaliar(ramo.cond));
          this.passo(ramo.linha, { comando: k === 0 ? 'if' : 'elif', condicao: r });
          if (r) {
            this.executarBloco(ramo.corpo);
            return;
          }
        }
        if (c.senao) this.executarBloco(c.senao);
        return;
      case 'enquanto':
        for (;;) {
          this.linha = c.linha;
          const r = verdadeiro(this.avaliar(c.cond));
          this.passo(c.linha, { comando: 'while', condicao: r });
          if (!r) return;
          if (this.corpoDeLaco(c.corpo) === 'break') return;
        }
      case 'para': {
        const proximo = this.iterador(this.avaliar(c.iter));
        for (;;) {
          this.linha = c.linha;
          const item = proximo();
          if (item.fim) {
            this.passo(c.linha, { comando: 'for', fimDoLaco: true });
            return;
          }
          this.vars.set(c.variavel, item.v);
          this.passo(c.linha, { comando: 'for', fimDoLaco: false });
          if (this.corpoDeLaco(c.corpo) === 'break') return;
        }
      }
      default:
        throw new Error(`comando desconhecido: ${c.tipo}`);
    }
  }

  corpoDeLaco(corpo) {
    try {
      this.executarBloco(corpo);
    } catch (x) {
      if (x instanceof Interrupcao) return x.tipo;
      throw x;
    }
    return null;
  }

  iterador(v) {
    if (ehLista(v)) {
      let i = 0;
      return () => (i < v.length ? { v: v[i++] } : { fim: true });
    }
    if (v instanceof PyRange) {
      let i = 0;
      return () => (i < v.tamanho ? { v: v.item(i++) } : { fim: true });
    }
    if (ehStr(v)) {
      const chars = Array.from(v);
      let i = 0;
      return () => (i < chars.length ? { v: chars[i++] } : { fim: true });
    }
    throw new ErroPython('TypeError', `não dá para percorrer um valor do tipo '${nomeTipo(v)}' com for`);
  }

  atribuir(alvo, valor) {
    if (alvo.tipo === 'nome') {
      this.vars.set(alvo.nome, valor);
      return;
    }
    const obj = this.avaliar(alvo.obj);
    const idx = this.avaliar(alvo.idx);
    this.guardarIndice(obj, idx, valor);
  }

  guardarIndice(obj, idx, valor) {
    if (!ehLista(obj)) {
      throw new ErroPython('TypeError', `não dá para mudar uma posição de um valor do tipo '${nomeTipo(obj)}'`);
    }
    obj[this.posicao(obj, idx, 'list assignment')] = valor;
  }

  atribuicaoAumentada(c) {
    const { op, alvo } = c;
    if (alvo.tipo === 'nome') {
      const atual = this.lerVariavel(alvo.nome);
      const v = this.avaliar(c.valor);
      if (op === '+' && ehLista(atual)) {
        this.estenderLista(atual, v);
        this.vars.set(alvo.nome, atual);
      } else {
        this.vars.set(alvo.nome, this.binaria(op, atual, v));
      }
      return;
    }
    const obj = this.avaliar(alvo.obj);
    const idx = this.avaliar(alvo.idx);
    const atual = this.indexar(obj, idx);
    const v = this.avaliar(c.valor);
    if (op === '+' && ehLista(atual)) {
      this.estenderLista(atual, v);
      this.guardarIndice(obj, idx, atual);
    } else {
      this.guardarIndice(obj, idx, this.binaria(op, atual, v));
    }
  }

  estenderLista(lista, v) {
    const proximo = this.iterador(v);
    const novos = [];
    for (let item = proximo(); !item.fim; item = proximo()) novos.push(item.v);
    lista.push(...novos);
    if (lista.length > MAX_TAMANHO) throw new ErroPython('LimiteDoJogo', 'lista grande demais');
  }

  lerVariavel(nome) {
    if (this.vars.has(nome)) return this.vars.get(nome);
    if (this.embutidas.has(nome)) return this.embutidas.get(nome);
    throw new ErroPython('NameError', `a variável '${nome}' ainda não foi criada`);
  }

  // ------------------------------------------------------------------ expressões
  avaliar(e) {
    switch (e.tipo) {
      case 'const': return e.v;
      case 'nome': return this.lerVariavel(e.nome);
      case 'lista': return e.itens.map((x) => this.avaliar(x));
      case 'ou': {
        const a = this.avaliar(e.a);
        return verdadeiro(a) ? a : this.avaliar(e.b);
      }
      case 'e': {
        const a = this.avaliar(e.a);
        return verdadeiro(a) ? this.avaliar(e.b) : a;
      }
      case 'nao': return !verdadeiro(this.avaliar(e.a));
      case 'unario': return this.unaria(e.op, this.avaliar(e.a));
      case 'bin': return this.binaria(e.op, this.avaliar(e.a), this.avaliar(e.b));
      case 'comp': {
        let esq = this.avaliar(e.termos[0]);
        for (let k = 0; k < e.ops.length; k++) {
          const dir = this.avaliar(e.termos[k + 1]);
          if (!this.comparar(e.ops[k], esq, dir)) return false;
          esq = dir;
        }
        return true;
      }
      case 'indice': return this.indexar(this.avaliar(e.obj), this.avaliar(e.idx));
      case 'chamada': return this.chamar(e);
      case 'atributo':
        throw new ErroPython('TypeError', `métodos como '${e.nome}' precisam ser chamados com ()`);
      default:
        throw new Error(`expressão desconhecida: ${e.tipo}`);
    }
  }

  unaria(op, a) {
    if (!ehNum(a)) {
      throw new ErroPython('TypeError', `não dá para usar '${op}' antes de um valor do tipo '${nomeTipo(a)}'`);
    }
    if (op === '+') return ehBool(a) ? num(a) : a;
    if (ehFloat(a)) return new PyFloat(-a.v);
    return criarInt(-num(a));
  }

  binaria(op, a, b) {
    if (ehNum(a) && ehNum(b)) return aritmetica(op, a, b);
    if (op === '+') {
      if (ehStr(a) && ehStr(b)) return limitar(a + b);
      if (ehLista(a) && ehLista(b)) return limitar([...a, ...b]);
    }
    if (op === '*') {
      if ((ehStr(a) || ehLista(a)) && ehInteiroLike(b)) return repetir(a, num(b));
      if (ehInteiroLike(a) && (ehStr(b) || ehLista(b))) return repetir(b, num(a));
    }
    throw new ErroPython(
      'TypeError',
      `não dá para usar '${op}' entre '${nomeTipo(a)}' e '${nomeTipo(b)}'`,
    );
  }

  comparar(op, a, b) {
    switch (op) {
      case '==': return iguais(a, b);
      case '!=': return !iguais(a, b);
      case 'in': return this.contem(b, a);
      case 'not in': return !this.contem(b, a);
      default: {
        const c = ordenar(a, b, op);
        if (op === '<') return c < 0;
        if (op === '>') return c > 0;
        if (op === '<=') return c <= 0;
        return c >= 0;
      }
    }
  }

  contem(recipiente, x) {
    if (ehLista(recipiente)) return recipiente.some((v) => iguais(v, x));
    if (ehStr(recipiente)) {
      if (!ehStr(x)) throw new ErroPython('TypeError', `só dá para procurar texto dentro de texto (recebeu '${nomeTipo(x)}')`);
      return recipiente.includes(x);
    }
    if (recipiente instanceof PyRange) {
      if (!ehNum(x)) return false;
      for (let i = 0; i < recipiente.tamanho; i++) if (recipiente.item(i) === num(x)) return true;
      return false;
    }
    throw new ErroPython('TypeError', `não dá para usar 'in' com um valor do tipo '${nomeTipo(recipiente)}'`);
  }

  posicao(seq, idx, contexto) {
    if (!ehInteiroLike(idx)) {
      throw new ErroPython('TypeError', `a posição deve ser um número inteiro, não '${nomeTipo(idx)}'`);
    }
    let i = num(idx);
    const n = seq.length;
    if (i < 0) i += n;
    if (i < 0 || i >= n) {
      const tipo = contexto === 'list assignment' || ehLista(seq) ? 'lista' : 'texto';
      throw new ErroPython('IndexError', `a posição ${num(idx)} não existe (${tipo} com ${n} elementos)`);
    }
    return i;
  }

  indexar(obj, idx) {
    if (ehLista(obj)) return obj[this.posicao(obj, idx)];
    if (ehStr(obj)) {
      const chars = Array.from(obj);
      return chars[this.posicao(chars, idx, 'str')];
    }
    if (obj instanceof PyRange) {
      const i = this.posicao({ length: obj.tamanho }, idx, 'range');
      return obj.item(i);
    }
    throw new ErroPython('TypeError', `não dá para pegar uma posição de um valor do tipo '${nomeTipo(obj)}'`);
  }

  chamar(e) {
    const args = e.args.map((a) => this.avaliar(a));
    const nomeados = {};
    for (const [k, v] of Object.entries(e.nomeados)) nomeados[k] = this.avaliar(v);

    if (e.func.tipo === 'atributo') {
      const obj = this.avaliar(e.func.obj);
      return this.metodo(obj, e.func.nome, args, nomeados);
    }
    const f = this.avaliar(e.func);
    if (!(f instanceof Embutida)) {
      throw new ErroPython('TypeError', `um valor do tipo '${nomeTipo(f)}' não pode ser chamado como função`);
    }
    if (f.nome !== 'print' && Object.keys(nomeados).length) {
      throw new ErroPython('TypeError', `${f.nome}() não aceita argumentos com nome neste jogo`);
    }
    return f.fn(args, nomeados);
  }

  metodo(obj, nome, args) {
    if (ehLista(obj) && nome === 'append') {
      contarArgs('append', args, 1, 1);
      obj.push(args[0]);
      if (obj.length > MAX_TAMANHO) throw new ErroPython('LimiteDoJogo', 'lista grande demais');
      return null;
    }
    throw new ErroPython('AttributeError', `'${nomeTipo(obj)}' não tem o método '${nome}' neste jogo`);
  }
}

// ---------------------------------------------------------------- aritmética

function aritmetica(op, a, b) {
  const x = num(a);
  const y = num(b);
  const real = ehFloat(a) || ehFloat(b);
  switch (op) {
    case '+': return real ? new PyFloat(x + y) : criarInt(x + y);
    case '-': return real ? new PyFloat(x - y) : criarInt(x - y);
    case '*': return real ? new PyFloat(x * y) : criarInt(x * y);
    case '/':
      if (y === 0) throw new ErroPython('ZeroDivisionError', 'divisão por zero');
      return new PyFloat(x / y);
    case '//':
      if (y === 0) throw new ErroPython('ZeroDivisionError', 'divisão inteira por zero');
      return real ? new PyFloat(divmodReal(x, y)[0]) : criarInt(divInteira(x, y));
    case '%':
      if (y === 0) throw new ErroPython('ZeroDivisionError', 'resto de divisão por zero');
      return real ? new PyFloat(divmodReal(x, y)[1]) : criarInt(restoInteiro(x, y));
    case '**':
      if (!real && y >= 0) return criarInt(x ** y);
      if (x === 0 && y < 0) throw new ErroPython('ZeroDivisionError', 'zero elevado a número negativo');
      if (x < 0 && !Number.isInteger(y)) {
        throw new ErroPython('ValueError', 'número negativo elevado a fração não é usado neste jogo');
      }
      return new PyFloat(x ** y);
    default:
      throw new Error(`operador desconhecido ${op}`);
  }
}

function divInteira(x, y) {
  let q = Math.trunc(x / y);
  if (x % y !== 0 && (x < 0) !== (y < 0)) q -= 1;
  return q;
}

function restoInteiro(x, y) {
  let r = x % y;
  if (r !== 0 && (r < 0) !== (y < 0)) r += y;
  return r;
}

// Mesmo algoritmo do CPython (float_divmod) para // e % com floats.
function divmodReal(vx, wx) {
  let mod = vx % wx;
  let div = (vx - mod) / wx;
  if (mod) {
    if ((wx < 0) !== (mod < 0)) {
      mod += wx;
      div -= 1.0;
    }
  } else {
    mod = Math.sign(wx) < 0 || Object.is(wx, -0) ? -0.0 : 0.0;
  }
  let floordiv;
  if (div) {
    floordiv = Math.floor(div);
    if (div - floordiv > 0.5) floordiv += 1.0;
  } else {
    const s = vx / wx;
    floordiv = s < 0 || Object.is(s, -0) ? -0.0 : 0.0;
  }
  return [floordiv, mod];
}

function ordenar(a, b, op) {
  if (ehNum(a) && ehNum(b)) {
    const x = num(a);
    const y = num(b);
    if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (ehStr(a) && ehStr(b)) {
    const x = Array.from(a).map((c) => c.codePointAt(0));
    const y = Array.from(b).map((c) => c.codePointAt(0));
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    }
    return x.length - y.length;
  }
  if (ehLista(a) && ehLista(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (!iguais(a[i], b[i])) return ordenar(a[i], b[i], op);
    }
    return a.length - b.length;
  }
  throw new ErroPython(
    'TypeError',
    `não dá para comparar com '${op}' um '${nomeTipo(a)}' e um '${nomeTipo(b)}'`,
  );
}

function limitar(v) {
  if (v.length > MAX_TAMANHO) throw new ErroPython('LimiteDoJogo', 'texto ou lista grande demais');
  return v;
}

function repetir(seq, n) {
  if (n <= 0) return ehStr(seq) ? '' : [];
  if (seq.length * n > MAX_TAMANHO) throw new ErroPython('LimiteDoJogo', 'texto ou lista grande demais');
  if (ehStr(seq)) return seq.repeat(n);
  const r = [];
  for (let i = 0; i < n; i++) r.push(...seq);
  return r;
}

function contarArgs(nome, args, min, max) {
  if (args.length < min || args.length > max) {
    const esperado = min === max ? `${min}` : `de ${min} a ${max}`;
    throw new ErroPython('TypeError', `${nome}() recebe ${esperado} argumento(s), mas recebeu ${args.length}`);
  }
}

// ---------------------------------------------------------------- funções embutidas

function criarEmbutidas(m) {
  const tabela = {
    print(args, { sep = ' ', end = '\n' }) {
      for (const [nome, v] of [['sep', sep], ['end', end]]) {
        if (v !== null && !ehStr(v)) throw new ErroPython('TypeError', `${nome} deve ser texto`);
      }
      m.escrever(args.map(strPy).join(sep ?? ' ') + (end ?? '\n'));
      return null;
    },
    input(args) {
      contarArgs('input', args, 0, 1);
      if (args.length) m.escrever(strPy(args[0]));
      if (!m.entradas.length) throw new ErroPython('EOFError', 'o desafio não forneceu mais entradas');
      return m.entradas.shift();
    },
    len(args) {
      contarArgs('len', args, 1, 1);
      const x = args[0];
      if (ehStr(x)) return Array.from(x).length;
      if (ehLista(x)) return x.length;
      if (x instanceof PyRange) return x.tamanho;
      throw new ErroPython('TypeError', `um valor do tipo '${nomeTipo(x)}' não tem tamanho (len)`);
    },
    range(args) {
      contarArgs('range', args, 1, 3);
      for (const a of args) {
        if (!ehInteiroLike(a)) throw new ErroPython('TypeError', `range() só aceita inteiros, não '${nomeTipo(a)}'`);
      }
      const n = args.map(num);
      const [inicio, fim, passo] = n.length === 1 ? [0, n[0], 1] : [n[0], n[1], n[2] ?? 1];
      if (passo === 0) throw new ErroPython('ValueError', 'o passo do range() não pode ser zero');
      return new PyRange(inicio, fim, passo);
    },
    int(args) {
      contarArgs('int', args, 0, 1);
      if (!args.length) return 0;
      const x = args[0];
      if (ehInteiroLike(x)) return num(x);
      if (ehFloat(x)) {
        if (!Number.isFinite(x.v)) throw new ErroPython('ValueError', 'não dá para converter infinito/nan em int');
        return criarInt(Math.trunc(x.v));
      }
      if (ehStr(x)) {
        const s = x.trim();
        if (/^[+-]?\d+(_\d+)*$/.test(s)) return criarInt(parseInt(s.replace(/_/g, ''), 10));
        throw new ErroPython('ValueError', `o texto ${reprPy(x)} não é um número inteiro`);
      }
      throw new ErroPython('TypeError', `int() não converte um valor do tipo '${nomeTipo(x)}'`);
    },
    float(args) {
      contarArgs('float', args, 0, 1);
      if (!args.length) return new PyFloat(0);
      const x = args[0];
      if (ehNum(x)) return new PyFloat(num(x));
      if (ehStr(x)) {
        const s = x.trim();
        if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return new PyFloat(parseFloat(s));
        throw new ErroPython('ValueError', `o texto ${reprPy(x)} não é um número`);
      }
      throw new ErroPython('TypeError', `float() não converte um valor do tipo '${nomeTipo(x)}'`);
    },
    str(args) {
      contarArgs('str', args, 0, 1);
      return args.length ? strPy(args[0]) : '';
    },
    abs(args) {
      contarArgs('abs', args, 1, 1);
      const x = args[0];
      if (ehFloat(x)) return new PyFloat(Math.abs(x.v));
      if (ehNum(x)) return Math.abs(num(x));
      throw new ErroPython('TypeError', `abs() não aceita '${nomeTipo(x)}'`);
    },
    min(args) { return extremo('min', args, (c) => c < 0); },
    max(args) { return extremo('max', args, (c) => c > 0); },
    sum(args) {
      contarArgs('sum', args, 1, 1);
      const proximo = m.iterador(args[0]);
      let total = 0;
      for (let item = proximo(); !item.fim; item = proximo()) {
        if (ehStr(item.v)) throw new ErroPython('TypeError', 'sum() não soma textos');
        total = m.binaria('+', total, item.v);
      }
      return total;
    },
  };

  function extremo(nome, args, melhor) {
    if (!args.length) throw new ErroPython('TypeError', `${nome}() precisa de pelo menos 1 argumento`);
    let itens = args;
    if (args.length === 1) {
      const proximo = m.iterador(args[0]);
      itens = [];
      for (let item = proximo(); !item.fim; item = proximo()) itens.push(item.v);
      if (!itens.length) throw new ErroPython('ValueError', `${nome}() recebeu uma sequência vazia`);
    }
    let r = itens[0];
    for (const v of itens.slice(1)) if (melhor(ordenar(v, r, nome === 'min' ? '<' : '>'))) r = v;
    return r;
  }

  const mapa = new Map();
  for (const [nome, fn] of Object.entries(tabela)) mapa.set(nome, new Embutida(nome, fn));
  return mapa;
}
