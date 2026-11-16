// Confere o que o jogador digitou contra o valor esperado (vindo do motor).
// Aceita só valores literais (7, 2.5, 'abc', True, [1, 2]) — nunca contas como "3+4".
import { analisarExpressao, nomeTipo, iguais, PyFloat } from '../motor/index.js';

function literal(no) {
  switch (no.tipo) {
    case 'const':
      return no.v;
    case 'lista':
      return no.itens.map(literal);
    case 'unario': {
      const v = literal(no.a);
      if (typeof v === 'number') return no.op === '-' ? -v || 0 : v;
      if (v instanceof PyFloat) return new PyFloat(no.op === '-' ? -v.v : v.v);
      throw new Error('não é literal');
    }
    default:
      throw new Error('não é literal');
  }
}

export function lerValor(texto) {
  try {
    return { ok: true, valor: literal(analisarExpressao(texto)) };
  } catch {
    return { ok: false };
  }
}

export function mesmoValor(a, b) {
  if (nomeTipo(a) !== nomeTipo(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => mesmoValor(v, b[i]));
  return iguais(a, b);
}

const MOTIVO_TIPO = {
  float: 'o resultado é um float: tem ponto decimal (como 4.0)',
  int: 'o resultado é um inteiro: sem ponto decimal',
  str: 'o valor é um texto (str)',
  bool: 'o valor é True ou False',
  list: 'o valor é uma lista, entre colchetes',
};

// Devolve { certo, motivo? }. `esperado` undefined = a variável ainda não existe.
export function conferirValor(texto, esperado) {
  const t = (texto ?? '').trim();
  if (esperado === undefined) {
    return t === '' ? { certo: true } : { certo: false, motivo: 'esta variável ainda não existe neste ponto' };
  }
  if (t === '') return { certo: false, motivo: 'esta variável já existe aqui: preencha o valor' };

  if (typeof esperado === 'string') {
    const r = lerValor(t);
    if (r.ok && typeof r.valor === 'string') return { certo: r.valor === esperado };
    if (t === esperado) return { certo: true }; // texto digitado sem aspas
    if (r.ok) return { certo: false, motivo: MOTIVO_TIPO.str };
    return { certo: false };
  }

  if (typeof esperado === 'boolean') {
    const baixo = t.toLowerCase();
    if (baixo === 'true' || baixo === 'false') return { certo: (baixo === 'true') === esperado };
    return { certo: false, motivo: MOTIVO_TIPO.bool };
  }

  const r = lerValor(t);
  if (!r.ok) return { certo: false, motivo: 'não entendi esse valor' };
  if (mesmoValor(r.valor, esperado)) return { certo: true };
  if (nomeTipo(r.valor) !== nomeTipo(esperado) && iguais(r.valor, esperado)) {
    return { certo: false, motivo: MOTIVO_TIPO[nomeTipo(esperado)] };
  }
  return { certo: false };
}

// Saída do print: ignora espaços e quebras de linha no fim.
export function conferirSaida(texto, esperado) {
  const normalizar = (s) => (s ?? '').replace(/\s+$/, '');
  return normalizar(texto) === normalizar(esperado);
}
