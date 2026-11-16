// Gerador de variações: sorteia os parâmetros de um desafio-modelo e monta o código final.
import { avaliarExpressao } from './interpretador.js';
import { PyFloat, reprPy, strPy, verdadeiro } from './valores.js';

// Gerador pseudoaleatório com semente (mulberry32): a mesma semente gera a mesma variação,
// o que permite registrar e reproduzir exatamente o que o jogador viu.
export function criarRng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function novaSemente() {
  return Math.floor(Math.random() * 2 ** 32);
}

const inteiro = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

function deJson(v) {
  if (typeof v === 'number' && !Number.isInteger(v)) return new PyFloat(v);
  if (Array.isArray(v)) return v.map(deJson);
  return v;
}

function sortear(param, rng, nome) {
  switch (param.tipo) {
    case 'int':
      return inteiro(rng, param.min, param.max);
    case 'escolha':
      return deJson(param.opcoes[inteiro(rng, 0, param.opcoes.length - 1)]);
    case 'lista': {
      const [tMin, tMax] = param.tamanho;
      const n = inteiro(rng, tMin, tMax);
      const lista = [];
      while (lista.length < n) {
        const v = inteiro(rng, param.min, param.max);
        if (param.distintos && lista.includes(v)) {
          if (param.max - param.min + 1 < n) throw new Error(`parâmetro ${nome}: faixa pequena demais para valores distintos`);
          continue;
        }
        lista.push(v);
      }
      return lista;
    }
    default:
      throw new Error(`parâmetro ${nome}: tipo desconhecido '${param.tipo}'`);
  }
}

const RE_MARCADOR = /\{([A-Z][A-Z0-9_]*)\}/g;

export function gerarVariacao(desafio, semente = novaSemente(), maxTentativas = 1000) {
  const rng = criarRng(semente);
  const params = desafio.parametros ?? {};
  let valores;
  let ok = false;
  for (let t = 0; t < maxTentativas && !ok; t++) {
    valores = {};
    for (const [nome, p] of Object.entries(params)) valores[nome] = sortear(p, rng, nome);
    ok = !desafio.condicao || verdadeiro(avaliarExpressao(desafio.condicao, valores));
  }
  if (!ok) throw new Error(`desafio ${desafio.id}: nenhuma variação satisfaz a condição '${desafio.condicao}'`);

  const substituir = (texto, formatar) => texto.replace(RE_MARCADOR, (m, nome) => {
    if (!(nome in valores)) throw new Error(`desafio ${desafio.id}: marcador {${nome}} sem parâmetro`);
    return formatar(valores[nome]);
  });

  return {
    id: desafio.id,
    semente,
    valores,
    codigo: desafio.codigo.map((l) => substituir(l, reprPy)).join('\n'),
    entradas: (desafio.entradas ?? []).map((e) => substituir(e, strPy)),
  };
}

// Caça ao bug: a mesma semente gera a versão com defeito (mostrada) e a corrigida
// (troca a linha `linhaBug` por `correcao`), com os mesmos valores sorteados.
export function gerarVariacaoBug(desafio, semente = novaSemente()) {
  const comBug = gerarVariacao(desafio, semente);
  const codigoCorreto = desafio.codigo.map((l, i) => (i + 1 === desafio.linhaBug ? desafio.correcao : l));
  const correta = gerarVariacao({ ...desafio, codigo: codigoCorreto }, semente);
  return { comBug, correta };
}
