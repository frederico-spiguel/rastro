import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conferirValor, conferirSaida } from '../src/app/respostas.js';
import { PyFloat } from '../src/motor/index.js';

const certo = (t, e) => conferirValor(t, e).certo;

test('inteiros e floats são diferentes', () => {
  assert.equal(certo('7', 7), true);
  assert.equal(certo(' -3 ', -3), true);
  assert.equal(certo('7.0', 7), false);
  assert.match(conferirValor('7.0', 7).motivo, /inteiro/);
  assert.equal(certo('4.0', new PyFloat(4)), true);
  assert.equal(certo('4.00', new PyFloat(4)), true);
  assert.equal(certo('4', new PyFloat(4)), false);
  assert.match(conferirValor('4', new PyFloat(4)).motivo, /float/);
  assert.equal(certo('3+4', 7), false);
});

test('textos com ou sem aspas', () => {
  assert.equal(certo("'par'", 'par'), true);
  assert.equal(certo('"par"', 'par'), true);
  assert.equal(certo('par', 'par'), true);
  assert.equal(certo('ímpar', 'par'), false);
  assert.equal(certo('7', '7'), true);
});

test('booleanos e listas', () => {
  assert.equal(certo('True', true), true);
  assert.equal(certo('true', true), true);
  assert.equal(certo('False', true), false);
  assert.equal(certo('1', true), false);
  assert.equal(certo('[1, 2,3]', [1, 2, 3]), true);
  assert.equal(certo('[1, 2]', [1, 2, 3]), false);
});

test('variável que ainda não existe deve ficar vazia', () => {
  assert.equal(certo('', undefined), true);
  assert.equal(certo('0', undefined), false);
  assert.equal(certo('', 0), false);
});

test('saída ignora espaços no fim', () => {
  assert.equal(conferirSaida('40 20 10', '40 20 10 '), true);
  assert.equal(conferirSaida('Dobro: 8', 'Dobro: 8\n'), true);
  assert.equal(conferirSaida('Dobro:8', 'Dobro: 8\n'), false);
});
