// O pré/pós-teste precisa estar certo: gabarito igual ao Python real e formas A e B
// equivalentes (mesmo caminho de execução, mudando só os valores).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { executar } from '../src/motor/index.js';
import { acharPython, compararComPython } from './comparar.js';

// As questões não vão para o repositório público antes do piloto (ver .gitignore).
const ARQ = new URL('../pesquisa/testes.json', import.meta.url);
const { questoes } = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : { questoes: [] };
const caminho = (linhas) => executar(linhas.join('\n')).passos.map((p) => `${p.linha}${p.condicao === undefined ? '' : p.condicao ? 'V' : 'F'}`).join(' ');

test('8 questões, 2 por trilha', { skip: !questoes.length && 'pesquisa/testes.json ausente' }, () => {
  assert.equal(questoes.length, 8);
  for (const t of [1, 2, 3, 4]) assert.equal(questoes.filter((q) => q.trilha === t).length, 2);
});

for (const q of questoes) {
  test(`questão ${q.numero}: formas A e B são equivalentes`, () => {
    for (const f of ['A', 'B']) {
      const r = executar(q[f].join('\n'));
      assert.equal(r.ok, true, `${f}: ${JSON.stringify(r.erro)}`);
      for (const v of q.perguntar) assert.ok(v in r.passos.at(-1).vars, `${f}: variável ${v} não existe`);
    }
    assert.equal(caminho(q.A), caminho(q.B), 'as duas formas devem seguir as mesmas linhas e condições');
    assert.notDeepEqual(q.A, q.B);
    const final = (l) => { const v = executar(l.join('\n')).passos.at(-1).vars; return q.perguntar.map((n) => JSON.stringify(v[n])).join(); };
    assert.notEqual(final(q.A), final(q.B), 'as respostas de A e B devem ser diferentes');
  });
}

test('gabarito do teste bate com o Python real', { skip: (!questoes.length && 'sem questões') || (!acharPython() && 'Python 3 não encontrado') }, () => {
  const casos = questoes.flatMap((q) => ['A', 'B'].map((f) => ({ id: `Q${q.numero}${f}`, codigo: q[f].join('\n'), entradas: [] })));
  const problemas = compararComPython(casos);
  assert.equal(problemas.length, 0, problemas.join('\n'));
});
