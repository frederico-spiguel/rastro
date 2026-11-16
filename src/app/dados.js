// Banco de desafios. A lista de arquivos fica em data/desafios/indice.json:
// para acrescentar uma trilha, basta criar o JSON e citá-lo no índice (sem mexer no código).
import { CONFIG } from '../config.js';

let cache = null;

async function lerJson(caminho) {
  const r = await fetch(caminho, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`não consegui carregar ${caminho}`);
  return r.json();
}

// Todas as trilhas, incluindo a 0 (tutorial).
export async function carregarTodas() {
  if (!cache) {
    cache = lerJson('data/desafios/indice.json')
      .then((indice) => Promise.all(indice.arquivos.map((a) => lerJson(`data/desafios/${a}`))))
      .then((ts) => ts.sort((a, b) => a.trilha - b.trilha));
    cache.catch(() => { cache = null; });
  }
  return cache;
}

// Trilhas que aparecem no menu (sem o tutorial).
export async function carregarTrilhas() {
  return (await carregarTodas()).filter((t) => t.trilha > 0);
}

export async function acharDesafio(id) {
  for (const trilha of await carregarTodas()) {
    const i = trilha.desafios.findIndex((d) => d.id === id);
    if (i >= 0) return { trilha, desafio: trilha.desafios[i], proximo: trilha.desafios[i + 1] ?? null };
  }
  return null;
}

// Estado de cada trilha: bloqueada, aberta ou concluída (critério de desbloqueio).
export function estadoDasTrilhas(trilhas, progresso) {
  let anteriorOk = true;
  const liberadas = new Set();
  return trilhas.map((t) => {
    const feitos = t.desafios.filter((d) => progresso[d.id]?.concluido).length;
    const total = t.desafios.length;
    // `liberaCom: N` = abre junto com a trilha N (usado pela Caça ao bug).
    const aberta = CONFIG.liberarTodasAsTrilhas || (t.liberaCom ? liberadas.has(t.liberaCom) : anteriorOk);
    if (aberta) liberadas.add(t.trilha);
    const estado = feitos === total ? 'concluida' : aberta ? 'aberta' : 'bloqueada';
    anteriorOk = feitos / total >= CONFIG.percentualParaDesbloquear;
    const precisa = Math.ceil(total * CONFIG.percentualParaDesbloquear);
    return { trilha: t, feitos, total, estado, precisaParaLiberarProxima: precisa };
  });
}

export function proximoDesafio(trilhas, progresso) {
  for (const s of estadoDasTrilhas(trilhas, progresso)) {
    if (s.estado !== 'aberta') continue;
    const d = s.trilha.desafios.find((x) => !progresso[x.id]?.concluido);
    if (d) return d;
  }
  return null;
}
