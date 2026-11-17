import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { estadoDasTrilhas, proximoDesafio } from '../src/app/dados.js';
import { CONFIG } from '../src/config.js';

const trilha = (n, qtd) => ({
  trilha: n, nome: `T${n}`, desafios: Array.from({ length: qtd }, (_, i) => ({ id: `t${n}-0${i + 1}` })),
});
const TRILHAS = [trilha(1, 5), trilha(2, 4), trilha(3, 3)];
const COM_BUG = [...TRILHAS, { ...trilha(5, 2), liberaCom: 2 }];
const feito = (...ids) => Object.fromEntries(ids.map((id) => [id, { concluido: true, estrelas: 1, vezes: 1 }]));
const estados = (p) => estadoDasTrilhas(TRILHAS, p).map((s) => s.estado);

test('só a trilha 1 começa aberta', () => {
  assert.deepEqual(estados({}), ['aberta', 'bloqueada', 'bloqueada']);
});

test('libera a próxima ao atingir o percentual (60% de 5 = 3)', () => {
  assert.equal(CONFIG.percentualParaDesbloquear, 0.6);
  assert.deepEqual(estados(feito('t1-01', 't1-02')), ['aberta', 'bloqueada', 'bloqueada']);
  assert.deepEqual(estados(feito('t1-01', 't1-02', 't1-03')), ['aberta', 'aberta', 'bloqueada']);
});

test('trilha concluída aparece como concluída e a seguinte abre', () => {
  const p = feito('t1-01', 't1-02', 't1-03', 't1-04', 't1-05');
  assert.deepEqual(estados(p), ['concluida', 'aberta', 'bloqueada']);
  assert.equal(proximoDesafio(TRILHAS, p).id, 't2-01');
});

test('Caça ao bug abre junto com a trilha indicada', () => {
  const e = (p) => estadoDasTrilhas(COM_BUG, p).map((s) => s.estado);
  assert.equal(e({})[3], 'bloqueada');
  assert.equal(e(feito('t1-01', 't1-02', 't1-03'))[3], 'aberta');
});

test('próximo desafio pula os já feitos', () => {
  assert.equal(proximoDesafio(TRILHAS, feito('t1-01', 't1-03')).id, 't1-02');
});

test('índice lista todos os arquivos de trilha', () => {
  const pasta = new URL('../data/desafios/', import.meta.url);
  const indice = JSON.parse(readFileSync(new URL('indice.json', pasta), 'utf8')).arquivos.sort();
  const arquivos = readdirSync(pasta).filter((f) => /^trilha\d+\.json$/.test(f)).sort();
  assert.deepEqual(indice, arquivos);
});

test('forma do pré/pós-teste segue a paridade do código de participante', async () => {
  const { formasDoParticipante } = await import('../src/app/telas-jogo.js');
  assert.deepEqual(formasDoParticipante('RST01'), { pre: 'A', pos: 'B' });
  assert.deepEqual(formasDoParticipante('rst12 '), { pre: 'B', pos: 'A' });
  assert.equal(formasDoParticipante(''), null);
  assert.equal(formasDoParticipante('TESTE'), null);
});
