// Tela de desafio (modo rastreamento): o jogador preenche a tabela de teste de mesa,
// um passo de cada vez, e recebe feedback imediato comparando com o motor.
import { executar, gerarVariacao, novaSemente, reprPy } from '../motor/index.js';
import { conferirValor, conferirSaida } from './respostas.js';
import { servico } from './servico.js';
import { el, trocar } from './dom.js';

// Desafios em andamento ficam guardados aqui: voltar ao menu não perde o que foi feito.
const emAndamento = new Map();

export function telaDesafio(raiz, { trilha, desafio, proximo }) {
  const chave = `${servico.usuario()?.id}:${desafio.id}`;
  const tutorial = !!desafio.tutorial;
  const saida = tutorial ? '#/menu' : `#/trilha/${trilha.trilha}`;
  let e = emAndamento.get(chave) ?? null;

  function novo(semente = novaSemente()) {
    const variacao = gerarVariacao(desafio, semente);
    const exec = executar(variacao.codigo, { entradas: variacao.entradas });
    e = {
      variacao,
      exec,
      linhasCodigo: variacao.codigo.split('\n'),
      colunas: colunasDe(exec.passos),
      idx: 0,
      feitos: [], // linhas da tabela já respondidas
      erros: 0,
      acertosDePrimeira: 0,
      dicasVistas: 0,
      revelados: 0,
      inicio: Date.now(),
      fim: null,
    };
    emAndamento.set(chave, e);
    servico.registrar('desafio_inicio', { desafio: desafio.id, semente });
    prepararPasso();
    desenhar();
  }

  function passoAtual() {
    return e.exec.passos[e.idx];
  }

  function prepararPasso() {
    const p = passoAtual();
    if (!p) return;
    const anterior = e.idx > 0 ? e.exec.passos[e.idx - 1].vars : {};
    e.rascunho = Object.fromEntries(e.colunas.map((c) => [c, c in anterior ? reprPy(anterior[c]) : '']));
    e.rascunhoSaida = '';
    e.errosNoPasso = 0;
    e.marcas = {};
    e.feedback = null;
    if (p.condicao !== undefined) e.fase = 'condicao';
    else if (p.comando === 'for') e.fase = 'for';
    else e.fase = 'valores';
  }

  function concluirPasso({ revelado = false } = {}) {
    const p = passoAtual();
    let obs = '';
    if (p.condicao !== undefined) obs = p.condicao ? 'condição: True' : 'condição: False';
    else if (p.fimDoLaco) obs = 'o for terminou';
    if (p.saida) obs = obs ? `${obs} · ${p.saida}` : p.saida;
    e.feitos.push({ linha: p.linha, vars: p.vars, obs, revelado, errou: e.errosNoPasso > 0 });
    if (!revelado && e.errosNoPasso === 0) e.acertosDePrimeira++;
    e.idx++;
    if (e.idx >= e.exec.passos.length) finalizar();
    else prepararPasso();
    desenhar();
  }

  function errar(texto, campos = []) {
    const p = passoAtual();
    e.erros++;
    e.errosNoPasso++;
    servico.registrar('passo_erro', {
      desafio: desafio.id, semente: e.variacao.semente, passo: e.idx + 1,
      linha: p.linha, comando: p.comando, campos, tentativa: e.errosNoPasso,
    });
    const sugestao = e.errosNoPasso >= 2 ? ' Que tal pedir uma dica?' : '';
    e.feedback = { tipo: 'erro', texto: `O rastro divergiu na linha ${p.linha}. ${texto}${sugestao}` };
    desenhar();
  }

  function responderCondicao(valor) {
    const p = passoAtual();
    if (valor === p.condicao) concluirPasso();
    else errar(`Calcule a condição de novo com os valores atuais das variáveis.`, ['condicao']);
  }

  function responderFor(continua) {
    const p = passoAtual();
    if (continua === !p.fimDoLaco) {
      if (p.fimDoLaco) concluirPasso();
      else {
        e.fase = 'valores';
        e.feedback = { tipo: 'ok', texto: 'Isso! Agora atualize a variável do for.' };
        desenhar();
      }
    } else {
      errar(continua
        ? 'Não há mais valores para o for percorrer.'
        : 'Ainda há valores para o for percorrer.', ['for']);
    }
  }

  function conferirValores() {
    const p = passoAtual();
    const erradas = [];
    const motivos = [];
    e.marcas = {};
    for (const c of e.colunas) {
      const r = conferirValor(e.rascunho[c], p.vars[c]);
      e.marcas[c] = r.certo ? 'certo' : 'errado';
      if (!r.certo) {
        erradas.push(c);
        if (r.motivo) motivos.push(`${c}: ${r.motivo}`);
      }
    }
    const pedeSaida = p.comando === 'print';
    let saidaErrada = false;
    if (pedeSaida && !conferirSaida(e.rascunhoSaida, p.saida)) {
      saidaErrada = true;
      e.marcas.__saida = 'errado';
    }
    if (!erradas.length && !saidaErrada) {
      concluirPasso();
      return;
    }
    const partes = [];
    if (erradas.length) partes.push(`Confira ${erradas.map((c) => `'${c}'`).join(', ')}.`);
    if (saidaErrada) partes.push('Confira o que aparece na tela.');
    if (motivos.length) partes.push(`(${motivos.join('; ')})`);
    errar(partes.join(' '), [...erradas, ...(saidaErrada ? ['saida'] : [])]);
  }

  function pedirDica() {
    if (e.dicasVistas < desafio.dicas.length) {
      e.dicasVistas++;
      servico.registrar('dica', { desafio: desafio.id, nivel: e.dicasVistas, passo: e.idx + 1 });
      desenhar();
    } else {
      e.revelados++;
      servico.registrar('passo_revelado', { desafio: desafio.id, passo: e.idx + 1, linha: passoAtual().linha });
      concluirPasso({ revelado: true });
    }
  }

  function finalizar() {
    e.fim = Date.now();
    const estrelas = calcularEstrelas(e);
    e.estrelas = estrelas;
    servico.salvarResultado(desafio.id, { estrelas }).catch(console.error);
    servico.registrar('desafio_fim', {
      desafio: desafio.id, semente: e.variacao.semente, passos: e.exec.passos.length,
      acertosDePrimeira: e.acertosDePrimeira, erros: e.erros, dicas: e.dicasVistas,
      revelados: e.revelados, segundos: Math.round((e.fim - e.inicio) / 1000), estrelas,
    });
  }

  function pular() {
    servico.registrar('desafio_pulado', { desafio: desafio.id, passo: e.idx + 1 });
    emAndamento.delete(chave);
    if (tutorial) servico.salvarResultado(desafio.id, { estrelas: 0 }).catch(console.error);
    location.hash = proximo ? `#/desafio/${proximo.id}` : saida;
  }

  // ------------------------------------------------------------------ desenho
  function desenhar() {
    const terminou = e.idx >= e.exec.passos.length;
    const p = passoAtual();
    trocar(
      raiz,
      el('div', { class: 'desafio' },
        cabecalho(terminou),
        el('div', { class: 'desafio-grade' },
          el('section', { class: 'painel-codigo', 'aria-label': 'Código' },
            blocoCodigo(terminou ? null : p.linha),
            e.variacao.entradas.length
              ? el('p', { class: 'entradas' }, 'Valores digitados pelo usuário (input): ',
                ...e.variacao.entradas.map((v) => el('code', {}, v)))
              : null),
          el('section', { class: 'painel-tabela', 'aria-label': 'Teste de mesa' },
            terminou || !tutorial ? null : orientacao(p),
            terminou ? null : instrucao(p),
            tabela(terminou),
            terminou ? resultado() : acoes(),
            dicas()))),
    );
    focarPrimeiroCampo();
  }

  function cabecalho(terminou) {
    return el('header', { class: 'desafio-topo' },
      el('a', { href: saida, class: 'voltar' }, '← ', tutorial ? 'Menu' : trilha.nome),
      el('div', { class: 'desafio-titulo' },
        el('h1', {}, desafio.titulo),
        el('span', { class: 'etiqueta' }, desafio.conceito)),
      terminou ? null : el('div', { class: 'progresso-passos', 'aria-label': 'Progresso' },
        el('span', {}, `Passo ${e.idx + 1} de ${e.exec.passos.length}`),
        el('div', { class: 'barra' }, el('div', { style: `width:${(100 * e.idx) / e.exec.passos.length}%` }))));
  }

  function blocoCodigo(linhaAtual) {
    return el('ol', { class: 'codigo' },
      e.linhasCodigo.map((texto, i) => el('li', {
        class: i + 1 === linhaAtual ? 'atual' : null,
        'aria-current': i + 1 === linhaAtual ? 'step' : null,
      }, el('code', {}, destacar(texto)))));
  }

  // Explicações extras do desafio de demonstração (tutorial).
  function orientacao(p) {
    let texto;
    if (e.fase === 'condicao') {
      texto = 'Linhas com if não mudam variáveis: só decidem o caminho. Calcule a condição com os valores atuais da tabela.';
    } else if (e.fase === 'for') {
      texto = 'O for decide se há mais um valor para percorrer.';
    } else if (p.comando === 'print') {
      texto = 'print não muda variáveis, mas mostra algo na tela. Escreva no campo "tela" exatamente o que aparece (valores separados por espaço).';
    } else if (e.idx === 0) {
      texto = 'Cada coluna da tabela é uma variável. Escreva o valor de cada uma DEPOIS desta linha. Quem ainda não existe fica vazio. Depois clique em Conferir (ou aperte Enter).';
    } else {
      texto = 'Os valores da linha anterior já vêm preenchidos. Mude só o que esta linha altera.';
    }
    return el('p', { class: 'orientacao' }, el('strong', {}, 'Tutorial: '), texto);
  }

  function instrucao(p) {
    const codigo = el('code', {}, e.linhasCodigo[p.linha - 1].trim());
    let texto;
    if (e.fase === 'condicao') texto = ['Linha ', p.linha, ': ', codigo, ' — a condição é verdadeira ou falsa?'];
    else if (e.fase === 'for') texto = ['Linha ', p.linha, ': ', codigo, ' — o for pega mais um valor ou termina?'];
    else if (p.comando === 'print') texto = ['Execute a linha ', p.linha, ': ', codigo, '. Atualize a tabela e escreva o que aparece na tela.'];
    else texto = ['Execute a linha ', p.linha, ': ', codigo, '. Como ficam as variáveis depois dela?'];
    return el('p', { class: 'instrucao' }, texto);
  }

  function tabela(terminou) {
    const p = passoAtual();
    const cab = el('tr', {},
      el('th', { scope: 'col' }, 'Linha'),
      e.colunas.map((c) => el('th', { scope: 'col' }, el('code', {}, c))),
      el('th', { scope: 'col' }, 'Tela / condição'));

    const linhas = e.feitos.map((f, i) => {
      const ant = i > 0 ? e.feitos[i - 1].vars : {};
      return el('tr', { class: f.revelado ? 'revelado' : null },
        el('td', { class: 'num' }, f.linha),
        e.colunas.map((c) => {
          const tem = c in f.vars;
          const mudou = tem && (!(c in ant) || reprPy(ant[c]) !== reprPy(f.vars[c]));
          return el('td', { class: mudou ? 'mudou' : 'igual' }, tem ? reprPy(f.vars[c]) : '');
        }),
        el('td', { class: 'obs' }, f.obs));
    });

    let atual = null;
    if (!terminou) {
      const editavel = e.fase === 'valores';
      atual = el('tr', { class: 'linha-atual' },
        el('td', { class: 'num' }, p.linha),
        e.colunas.map((c) => el('td', {},
          editavel
            ? el('input', {
              type: 'text', value: e.rascunho[c], 'aria-label': `valor de ${c}`,
              class: e.marcas[c] === 'errado' ? 'campo errado' : 'campo',
              autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
              onInput: (ev) => { e.rascunho[c] = ev.target.value; },
              onKeydown: (ev) => { if (ev.key === 'Enter') conferirValores(); },
            })
            : el('span', { class: 'fixo' }, e.rascunho[c]))),
        el('td', {},
          editavel && p.comando === 'print'
            ? el('input', {
              type: 'text', value: e.rascunhoSaida, 'aria-label': 'o que aparece na tela',
              placeholder: 'tela', class: e.marcas.__saida === 'errado' ? 'campo errado' : 'campo',
              autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
              onInput: (ev) => { e.rascunhoSaida = ev.target.value; },
              onKeydown: (ev) => { if (ev.key === 'Enter') conferirValores(); },
            })
            : null));
    }

    return el('div', { class: 'tabela-rolagem' },
      el('table', { class: 'mesa' }, el('thead', {}, cab), el('tbody', {}, linhas, atual)));
  }

  function acoes() {
    const feedback = e.feedback
      ? el('p', { class: `feedback ${e.feedback.tipo}`, role: 'status' }, e.feedback.texto)
      : null;
    let botoes;
    if (e.fase === 'condicao') {
      botoes = [
        el('button', { class: 'botao', onClick: () => responderCondicao(true) }, 'Verdadeira (True)'),
        el('button', { class: 'botao', onClick: () => responderCondicao(false) }, 'Falsa (False)'),
      ];
    } else if (e.fase === 'for') {
      botoes = [
        el('button', { class: 'botao', onClick: () => responderFor(true) }, 'Pega mais um valor'),
        el('button', { class: 'botao', onClick: () => responderFor(false) }, 'O for terminou'),
      ];
    } else {
      botoes = [el('button', { class: 'botao primario', onClick: conferirValores }, 'Conferir')];
    }
    const rotuloDica = e.dicasVistas < desafio.dicas.length
      ? `Dica (${e.dicasVistas + 1} de ${desafio.dicas.length})`
      : 'Mostrar resposta deste passo';
    return el('div', { class: 'acoes' },
      feedback,
      el('div', { class: 'botoes' }, botoes),
      el('div', { class: 'botoes secundarios' },
        el('button', { class: 'botao discreto', onClick: pedirDica }, rotuloDica),
        el('button', { class: 'botao discreto', onClick: () => novo() }, 'Novos valores'),
        el('button', { class: 'botao discreto', onClick: pular }, 'Pular desafio')));
  }

  function dicas() {
    if (!e.dicasVistas) return null;
    return el('aside', { class: 'dicas', 'aria-label': 'Dicas' },
      el('h2', {}, 'Dicas'),
      el('ol', {}, desafio.dicas.slice(0, e.dicasVistas).map((d) => el('li', {}, d))));
  }

  function resultado() {
    const segundos = Math.round((e.fim - e.inicio) / 1000);
    const total = e.exec.passos.length;
    return el('div', { class: 'resultado' },
      el('p', { class: 'estrelas', 'aria-label': `${e.estrelas} de 3 estrelas` },
        '★'.repeat(e.estrelas), el('span', { class: 'apagada' }, '★'.repeat(3 - e.estrelas))),
      el('h2', {}, 'Desafio concluído!'),
      el('dl', { class: 'numeros' },
        item('Acertos de primeira', `${e.acertosDePrimeira} de ${total}`),
        item('Erros', e.erros),
        item('Dicas usadas', e.dicasVistas),
        item('Tempo', formatarTempo(segundos))),
      e.exec.saida ? el('div', { class: 'tela-final' }, el('h3', {}, 'Tela'), el('pre', {}, e.exec.saida)) : null,
      el('p', { class: 'explicacao' }, desafio.explicacao),
      el('div', { class: 'botoes' },
        proximo
          ? el('a', { class: 'botao primario', href: `#/desafio/${proximo.id}`, onClick: () => emAndamento.delete(chave) }, 'Próximo desafio')
          : el('a', { class: 'botao primario', href: saida }, tutorial ? 'Começar a jogar' : 'Voltar à trilha'),
        el('button', { class: 'botao', onClick: () => novo() }, 'Jogar de novo com outros valores')));
  }

  function focarPrimeiroCampo() {
    const campos = [...raiz.querySelectorAll('.linha-atual input')];
    const alvo = campos.find((c) => c.classList.contains('errado')) ?? campos[0];
    if (alvo && window.matchMedia('(pointer: fine)').matches) {
      alvo.focus();
      alvo.select();
    }
  }

  if (!e || e.fim) novo();
  else desenhar();
}

// ------------------------------------------------------------------ utilidades
function colunasDe(passos) {
  const nomes = [];
  for (const p of passos) for (const k of Object.keys(p.vars)) if (!nomes.includes(k)) nomes.push(k);
  return nomes;
}

export function calcularEstrelas({ erros, dicasVistas, revelados }) {
  if (revelados === 0 && erros === 0 && dicasVistas === 0) return 3;
  if (revelados === 0 && erros <= 2) return 2;
  return 1;
}

export function item(rotulo, valor) {
  return el('div', {}, el('dt', {}, rotulo), el('dd', {}, valor));
}

export function formatarTempo(s) {
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

// Realce de sintaxe simples (palavras-chave, textos, números).
const RE_REALCE = /("[^"]*"|'[^']*')|(\b(?:if|elif|else|while|for|in|and|or|not|True|False|None|break|continue|pass)\b)|(\b\d+(?:\.\d+)?\b)|(\b(?:print|input|int|float|str|len|range|abs|min|max|sum)\b(?=\())/g;

export function destacar(texto) {
  const partes = [];
  let ultimo = 0;
  for (const m of texto.matchAll(RE_REALCE)) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const classe = m[1] ? 'tk-str' : m[2] ? 'tk-kw' : m[3] ? 'tk-num' : 'tk-fn';
    partes.push(el('span', { class: classe }, m[0]));
    ultimo = m.index + m[0].length;
  }
  partes.push(texto.slice(ultimo));
  return partes;
}
