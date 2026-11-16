// Testes do motor: (1) casos com resultado esperado escrito à mão;
// (2) uma bateria de programas comparados passo a passo com o Python real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executar, reprPy, analisar } from '../src/motor/index.js';
import { acharPython, compararComPython } from './comparar.js';

const rodar = (codigo, entradas) => executar(codigo, { entradas });
const valoresFinais = (r) => {
  const ultimo = r.passos[r.passos.length - 1];
  return Object.fromEntries(Object.entries(ultimo.vars).map(([k, v]) => [k, reprPy(v)]));
};

test('atribuição e expressões', () => {
  const r = rodar('a = 7\nb = 2\nc = a // b\nd = a % b\ne = a / b\nf = -7 // 2\ng = -7 % 3');
  assert.equal(r.ok, true);
  assert.deepEqual(valoresFinais(r), { a: '7', b: '2', c: '3', d: '1', e: '3.5', f: '-4', g: '2' });
});

test('floats são formatados como no Python', () => {
  const r = rodar('a = 10 / 2\nb = 1 / 3\nc = 0.1 + 0.2\nd = 1e16\ne = 0.00001\nf = 2.5 * 4');
  assert.deepEqual(valoresFinais(r), {
    a: '5.0', b: '0.3333333333333333', c: '0.30000000000000004', d: '1e+16', e: '1e-05', f: '10.0',
  });
});

test('um passo por linha, com if/else e while', () => {
  const r = rodar('i = 0\nwhile i < 2:\n    i = i + 1\nif i == 2:\n    x = 1\nelse:\n    x = 2');
  assert.deepEqual(r.passos.map((p) => p.linha), [1, 2, 3, 2, 3, 2, 4, 5]);
  assert.deepEqual(r.passos.map((p) => p.condicao), [undefined, true, undefined, true, undefined, false, true, undefined]);
});

test('for gera um passo por item e um passo final', () => {
  const r = rodar('s = 0\nfor k in range(3):\n    s = s + k');
  assert.deepEqual(r.passos.map((p) => p.linha), [1, 2, 3, 2, 3, 2, 3, 2]);
  assert.equal(r.passos.at(-1).fimDoLaco, true);
});

test('print com saída por passo, sep e end', () => {
  const r = rodar('print("a", 1, True)\nprint(1, 2, sep="-", end="!")\nprint([1, "x", 2.0])');
  assert.equal(r.saida, "a 1 True\n1-2![1, 'x', 2.0]\n");
  assert.deepEqual(r.passos.map((p) => p.saida), ['a 1 True\n', '1-2!', "[1, 'x', 2.0]\n"]);
});

test('entradas fornecidas pelo desafio', () => {
  const r = rodar('n = int(input())\nnome = input()\nprint(nome, n * 2)', ['21', 'Ana']);
  assert.equal(r.saida, 'Ana 42\n');
});

test('erros com tipo do Python e linha', () => {
  assert.deepEqual(rodar('x = 1\ny = x / 0').erro.tipo, 'ZeroDivisionError');
  assert.deepEqual(rodar('x = 1\ny = z + 1').erro, {
    tipo: 'NameError', mensagem: "a variável 'z' ainda não foi criada", linha: 2,
  });
  assert.equal(rodar('v = [1, 2]\nv[2] = 0').erro.tipo, 'IndexError');
  assert.equal(rodar('x = "a" + 1').erro.tipo, 'TypeError');
});

test('laço infinito é interrompido', () => {
  const r = rodar('x = 0\nwhile True:\n    x = x + 1');
  assert.equal(r.erro.tipo, 'LimiteDoJogo');
});

test('recursos fora do subconjunto dão erro de sintaxe claro', () => {
  for (const codigo of ['def f():\n    pass', 'import math', 'a, b = 1, 2', 'v = [x for x in range(3)]', 'x = v[1:2]']) {
    assert.throws(() => analisar(codigo), (e) => e.tipo === 'SyntaxError', codigo);
  }
});

// ------------------------------------------------------------------------------------------
// Bateria comparada com o Python real (cobre semântica fina: divisão, floats, laços, listas).
const PROGRAMAS = [
  'a = 5\nb = 3\nc = a + b * 2\nd = (a + b) * 2\ne = a ** 2\nf = 2 ** -1',
  'x = -7\ny = 2\nq = x // y\nr = x % y\nq2 = 7 // -2\nr2 = 7 % -2\nz = -x',
  'a = 7.5\nb = 2\nc = a // b\nd = a % b\ne = -a // b\nf = 1 // 0.1\ng = 1 % 0.1',
  'a = 1 / 3\nb = 2 / 3\nc = 100 / 7\nd = 1e15 + 0.3\ne = 123456789 / 1000\nf = 0.0001\ng = 0.00001234',
  'a = 3 / 1\nb = -0.0\nc = 1e22\nd = 5e-324\ne = 2.0 ** 60\nf = 10 ** 15 / 1',
  'x = True\ny = x + 1\nz = not x\nw = x and 0\nv = 0 or "vazio"\nu = 3 > 2 > 1\nt = 1 < 2 > 5',
  's = "abc"\nt = s + "d"\nu = s * 2\nn = len(s)\nc = s[0]\nd = s[-1]\ne = "b" in s',
  'v = [3, 1, 2]\nv[0] = 10\nv.append(5)\nn = len(v)\nultimo = v[-1]\nw = v + [0]\nz = [0] * 3',
  'v = [1, 2]\nw = v\nw[0] = 99\nw.append(3)\nv += [4]\nprint(v, w)',
  'i = 0\nwhile i < 3:\n    i = i + 1\n    if i == 2:\n        continue\n    print(i)\nprint("fim")',
  'for k in range(10):\n    if k == 3:\n        break\n    print(k)\nprint("depois")',
  'total = 0\nfor k in range(1, 10, 3):\n    total += k\nfor k in range(5, 0, -2):\n    total -= k\nprint(total)',
  'v = [4, 8, 15]\nsoma = 0\nfor x in v:\n    soma = soma + x\nmedia = soma / len(v)\nprint(soma, media)',
  'nota = 5\nif nota >= 7:\n    s = "aprovado"\nelif nota >= 4:\n    s = "recuperação"\nelse:\n    s = "reprovado"\nprint(s)',
  'nota = 2\nif nota >= 7:\n    s = 1\nelif nota >= 4:\n    s = 2\nelse:\n    s = 3',
  'a = 1\nb = -1\nif a > 0:\n    if b > 0:\n        q = 1\n    else:\n        q = 4\nelse:\n    q = 0\nprint(q)',
  'x = 3\nif x > 5:\n    x = 0\nx = x + 1\nif x:\n    pass\nprint(x)',
  'n = 1234\nd = 0\nwhile n > 0:\n    n = n // 10\n    d = d + 1\nprint(d)',
  'x = 20\nwhile x > 1:\n    print(x, end=" ")\n    x = x // 2\nprint()',
  'v = [5, 3, 9, 1]\nmaior = v[0]\nfor i in range(1, len(v)):\n    if v[i] > maior:\n        maior = v[i]\nprint(maior, max(v), min(v), sum(v))',
  'n = int(input())\nm = int(input("valor: "))\nprint(n + m)\nt = str(n) + "!"\nf = float("2.5") * 2',
  'v = []\nfor c in "oi!":\n    v.append(c)\nprint(v, len(v), "i" in v, 3 not in v)',
  'a = [1, 2] == [1, 2]\nb = [1, 2] < [1, 3]\nc = "abc" < "abd"\nd = 1 == 1.0\ne = "a" != "b"\nf = abs(-3)\ng = abs(-2.5)',
  's = \'it\\\'s\'\nt = "aspas \\"duplas\\""\nu = "linha\\nnova"\nv = [s, t, u]\nprint(v)',
  'x = 10\ny = 0\nz = x / y',
  'v = [1, 2, 3]\ni = 0\nwhile i <= len(v):\n    print(v[i])\n    i = i + 1',
  'x = 5\ny = x + "a"',
  'x = 1\nprint(y)',
  'n = int("abc")',
  'x = 0\ny = 0\nwhile x < 3:\n    while y < 2:\n        y = y + 1\n    x = x + 1\n    y = 0',
  'r = range(2, 8, 2)\nn = len(r)\nprimeiro = r[0]\nt = 4 in r\nprint(r)',
  'contador = 0\nfor i in range(3):\n    for j in range(i):\n        contador += 1\nprint(contador)',
];

test('motor igual ao Python real na bateria de programas', { skip: !acharPython() && 'Python 3 não encontrado' }, () => {
  const casos = PROGRAMAS.map((codigo, i) => ({
    id: `prog-${i + 1}`,
    codigo,
    entradas: codigo.includes('input') ? ['4', '6'] : [],
  }));
  const problemas = compararComPython(casos);
  assert.equal(problemas.length, 0, `\n${problemas.join('\n\n')}`);
});
