// Gera as formas A e B do pré/pós-teste e o gabarito (calculado pelo motor do jogo).
// Uso: node tools/gerar_testes.mjs   ->  pesquisa/forma-A.md, forma-B.md, gabarito.md
import { readFileSync, writeFileSync } from 'node:fs';
import { executar, reprPy } from '../src/motor/index.js';

const pasta = new URL('../pesquisa/', import.meta.url);
const { questoes } = JSON.parse(readFileSync(new URL('testes.json', pasta), 'utf8'));

export function gabarito(q, forma) {
  const r = executar(q[forma].join('\n'));
  if (!r.ok) throw new Error(`questão ${q.numero}${forma}: ${r.erro.mensagem}`);
  const fim = r.passos.at(-1).vars;
  return Object.fromEntries(q.perguntar.map((v) => [v, reprPy(fim[v])]));
}

function forma(letra) {
  const partes = [
    `# Rastro — Teste de rastreamento (forma ${letra})`,
    '',
    'Código de participante: ____________________',
    '',
    'Instruções: para cada programa em Python, escreva o valor FINAL das variáveis pedidas,',
    'depois de o programa inteiro ser executado. Não use computador. Você pode rabiscar ao lado.',
    'Atenção ao tipo: escreva `4.0` se o valor for float, e textos entre aspas.',
    '',
  ];
  for (const q of questoes) {
    partes.push(`## Questão ${q.numero}`, '', '```python', ...q[letra], '```', '');
    partes.push(...q.perguntar.map((v) => `- Valor final de \`${v}\`: ____________`), '');
  }
  return partes.join('\n');
}

function documentoGabarito() {
  const linhas = [
    '# Gabarito do pré/pós-teste (NÃO entregar aos participantes)',
    '',
    'Rubrica: 1 ponto por questão quando TODOS os valores pedidos estão corretos (total: 8).',
    'Gerado automaticamente pelo motor do jogo e conferido contra o Python real nos testes.',
    '',
    '| Questão | Trilha | Conceito | Forma A | Forma B |',
    '|---|---|---|---|---|',
  ];
  for (const q of questoes) {
    const fmt = (g) => Object.entries(g).map(([k, v]) => `${k} = ${v}`).join('; ');
    linhas.push(`| ${q.numero} | ${q.trilha} | ${q.conceito} | ${fmt(gabarito(q, 'A'))} | ${fmt(gabarito(q, 'B'))} |`);
  }
  linhas.push(
    '',
    '## Contrabalanceamento',
    '',
    'Participantes com código ímpar: forma A no pré-teste e B no pós-teste.',
    'Participantes com código par: forma B no pré-teste e A no pós-teste.',
  );
  return linhas.join('\n');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  writeFileSync(new URL('forma-A.md', pasta), `${forma('A')}\n`);
  writeFileSync(new URL('forma-B.md', pasta), `${forma('B')}\n`);
  writeFileSync(new URL('gabarito.md', pasta), `${documentoGabarito()}\n`);
  console.log('Gerados: pesquisa/forma-A.md, forma-B.md, gabarito.md');
}
