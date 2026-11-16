// Valida o banco de desafios: formato, tamanho, e se TODAS as variações sorteadas
// rodam sem erro no motor e dão exatamente o mesmo histórico que o Python real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { executar, gerarVariacao, gerarVariacaoBug } from '../src/motor/index.js';
import { acharPython, compararComPython } from './comparar.js';

const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'desafios');
const VARIACOES_POR_DESAFIO = 40;
const MAX_PASSOS_NO_JOGO = 40; // mais que isso fica cansativo de rastrear

const trilhas = readdirSync(PASTA)
  .filter((f) => /^trilha\d+\.json$/.test(f))
  .map((f) => ({ arquivo: f, ...JSON.parse(readFileSync(path.join(PASTA, f), 'utf8')) }));

const desafios = trilhas.flatMap((t) => t.desafios.map((d) => ({ ...d, trilha: t.trilha })));

test('ids únicos', () => {
  const ids = desafios.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const d of desafios) {
  test(`desafio ${d.id}: formato e execução`, () => {
    for (const campo of ['id', 'titulo', 'conceito', 'dificuldade', 'codigo', 'dicas', 'explicacao']) {
      assert.ok(d[campo] !== undefined, `falta o campo '${campo}'`);
    }
    assert.ok(d.codigo.length >= 3 && d.codigo.length <= 12, 'o código deve ter de 3 a 12 linhas');
    assert.ok(d.dicas.length >= 2, 'pelo menos 2 dicas (da mais geral à mais específica)');

    for (let s = 1; s <= VARIACOES_POR_DESAFIO; s++) {
      const v = gerarVariacao(d, s);
      const r = executar(v.codigo, { entradas: v.entradas });
      assert.equal(r.ok, true, `semente ${s}: ${JSON.stringify(r.erro)}\n${v.codigo}`);
      assert.ok(r.passos.length <= MAX_PASSOS_NO_JOGO, `semente ${s}: ${r.passos.length} passos\n${v.codigo}`);
    }
  });
}

for (const d of desafios.filter((x) => x.modo === 'bug')) {
  test(`caça ao bug ${d.id}: a correção muda a saída em todas as variações`, () => {
    assert.ok(Number.isInteger(d.linhaBug) && d.linhaBug >= 1 && d.linhaBug <= d.codigo.length);
    assert.ok(d.objetivo, 'falta o objetivo do programa');
    for (let s = 1; s <= VARIACOES_POR_DESAFIO; s++) {
      const { comBug, correta } = gerarVariacaoBug(d, s);
      const a = executar(comBug.codigo, { entradas: comBug.entradas });
      const b = executar(correta.codigo, { entradas: correta.entradas });
      assert.equal(b.ok, true, `correção com erro: ${JSON.stringify(b.erro)}`);
      assert.notEqual(a.saida, b.saida, `semente ${s}: a versão com bug dá a mesma saída
${comBug.codigo}`);
    }
  });
}

test('mesma semente gera a mesma variação', () => {
  const d = desafios[0];
  assert.deepEqual(gerarVariacao(d, 123), gerarVariacao(d, 123));
});

test('todas as variações batem com o Python real', { skip: !acharPython() && 'Python 3 não encontrado' }, () => {
  const casos = desafios.flatMap((d) => Array.from({ length: VARIACOES_POR_DESAFIO }, (_, i) => {
    const v = d.modo === 'bug' ? gerarVariacaoBug(d, i + 1).correta : gerarVariacao(d, i + 1);
    return { id: `${d.id}#${i + 1}`, codigo: v.codigo, entradas: v.entradas };
  }).concat(d.modo === 'bug' ? [{ id: `${d.id}#bug`, ...gerarVariacao(d, 1) }] : []));
  const problemas = compararComPython(casos);
  assert.equal(problemas.length, 0, `\n${problemas.slice(0, 5).join('\n\n')}`);
});
