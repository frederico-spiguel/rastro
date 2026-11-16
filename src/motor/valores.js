// Representação dos valores do Python simplificado em JavaScript.
//   int   -> number (sempre inteiro)
//   float -> PyFloat
//   bool  -> boolean
//   str   -> string
//   list  -> Array
//   None  -> null
//   range -> PyRange
import { ErroPython } from './erros.js';

export class PyFloat {
  constructor(v) {
    this.v = v;
  }
}

export class PyRange {
  constructor(inicio, fim, passo) {
    this.inicio = inicio;
    this.fim = fim;
    this.passo = passo;
  }
  get tamanho() {
    const { inicio, fim, passo } = this;
    if (passo > 0) return Math.max(0, Math.ceil((fim - inicio) / passo));
    return Math.max(0, Math.ceil((inicio - fim) / -passo));
  }
  item(i) {
    return this.inicio + i * this.passo;
  }
}

export class Embutida {
  constructor(nome, fn) {
    this.nome = nome;
    this.fn = fn;
  }
}

export const ehInt = (x) => typeof x === 'number';
export const ehFloat = (x) => x instanceof PyFloat;
export const ehBool = (x) => typeof x === 'boolean';
export const ehNum = (x) => ehInt(x) || ehFloat(x) || ehBool(x);
export const ehStr = (x) => typeof x === 'string';
export const ehLista = (x) => Array.isArray(x);
export const ehInteiroLike = (x) => ehInt(x) || ehBool(x);

export function num(x) {
  if (ehFloat(x)) return x.v;
  if (ehBool(x)) return x ? 1 : 0;
  return x;
}

export function nomeTipo(x) {
  if (x === null) return 'NoneType';
  if (ehBool(x)) return 'bool';
  if (ehInt(x)) return 'int';
  if (ehFloat(x)) return 'float';
  if (ehStr(x)) return 'str';
  if (ehLista(x)) return 'list';
  if (x instanceof PyRange) return 'range';
  if (x instanceof Embutida) return 'builtin_function_or_method';
  return 'object';
}

export function criarInt(n) {
  if (!Number.isSafeInteger(n)) {
    throw new ErroPython('OverflowError', 'número grande demais para este jogo');
  }
  return n === 0 ? 0 : n; // evita -0
}

// repr() de float igual ao do Python (menor representação que identifica o número).
export function floatRepr(v) {
  if (Number.isNaN(v)) return 'nan';
  if (v === Infinity) return 'inf';
  if (v === -Infinity) return '-inf';
  if (v === 0) return Object.is(v, -0) ? '-0.0' : '0.0';
  const sinal = v < 0 ? '-' : '';
  const [mant, expTexto] = Math.abs(v).toExponential().split('e');
  const e = parseInt(expTexto, 10);
  const digitos = mant.replace('.', '');
  if (e < -4 || e >= 16) {
    const m = digitos.length > 1 ? `${digitos[0]}.${digitos.slice(1)}` : digitos;
    const ex = (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
    return `${sinal}${m}e${ex}`;
  }
  let s;
  if (e >= 0) {
    if (digitos.length <= e + 1) s = digitos + '0'.repeat(e + 1 - digitos.length) + '.0';
    else s = `${digitos.slice(0, e + 1)}.${digitos.slice(e + 1)}`;
  } else {
    s = `0.${'0'.repeat(-e - 1)}${digitos}`;
  }
  return sinal + s;
}

function strRepr(s) {
  const aspas = s.includes("'") && !s.includes('"') ? '"' : "'";
  let r = aspas;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '\\') r += '\\\\';
    else if (ch === aspas) r += `\\${aspas}`;
    else if (ch === '\n') r += '\\n';
    else if (ch === '\t') r += '\\t';
    else if (ch === '\r') r += '\\r';
    else if (c < 0x20 || c === 0x7f) r += `\\x${c.toString(16).padStart(2, '0')}`;
    else r += ch;
  }
  return r + aspas;
}

export function reprPy(x) {
  if (x === null) return 'None';
  if (ehBool(x)) return x ? 'True' : 'False';
  if (ehInt(x)) return String(x);
  if (ehFloat(x)) return floatRepr(x.v);
  if (ehStr(x)) return strRepr(x);
  if (ehLista(x)) return `[${x.map(reprPy).join(', ')}]`;
  if (x instanceof PyRange) {
    return x.passo === 1
      ? `range(${x.inicio}, ${x.fim})`
      : `range(${x.inicio}, ${x.fim}, ${x.passo})`;
  }
  if (x instanceof Embutida) return `<built-in function ${x.nome}>`;
  return String(x);
}

export function strPy(x) {
  return ehStr(x) ? x : reprPy(x);
}

export function verdadeiro(x) {
  if (x === null) return false;
  if (ehBool(x)) return x;
  if (ehNum(x)) return num(x) !== 0;
  if (ehStr(x) || ehLista(x)) return x.length > 0;
  if (x instanceof PyRange) return x.tamanho > 0;
  return true;
}

export function iguais(a, b) {
  if (ehNum(a) && ehNum(b)) return num(a) === num(b);
  if (ehStr(a) && ehStr(b)) return a === b;
  if (ehLista(a) && ehLista(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => iguais(v, b[i]));
  }
  if (a instanceof PyRange && b instanceof PyRange) {
    if (a.tamanho !== b.tamanho) return false;
    for (let i = 0; i < a.tamanho; i++) if (a.item(i) !== b.item(i)) return false;
    return true;
  }
  return a === b;
}

export function copiaProfunda(x) {
  return ehLista(x) ? x.map(copiaProfunda) : x;
}
