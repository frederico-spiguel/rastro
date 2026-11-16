// Tela da Caça ao bug: o jogador vê o objetivo, o código, a saída obtida e a esperada,
// e aponta a linha com defeito.
import { executar, gerarVariacaoBug, novaSemente } from '../motor/index.js';
import { servico } from './servico.js';
import { el, trocar } from './dom.js';
import { destacar, calcularEstrelas, item, formatarTempo } from './desafio.js';

export function telaBug(raiz, { trilha, desafio, proximo }) {
  let e;
  const saida = `#/trilha/${trilha.trilha}`;

  function novo(semente = novaSemente()) {
    const { comBug, correta } = gerarVariacaoBug(desafio, semente);
    e = {
      comBug,
      linhas: comBug.codigo.split('\n'),
      linhaCorreta: correta.codigo.split('\n')[desafio.linhaBug - 1],
      obtida: executar(comBug.codigo, { entradas: comBug.entradas }),
      esperada: executar(correta.codigo, { entradas: correta.entradas }),
      escolhida: null,
      descartadas: new Set(),
      erros: 0,
      dicasVistas: 0,
      revelados: 0,
      inicio: Date.now(),
      fim: null,
      feedback: null,
    };
    servico.registrar('desafio_inicio', { desafio: desafio.id, semente, modo: 'bug' });
    desenhar();
  }

  function confirmar() {
    if (e.escolhida == null) {
      e.feedback = { tipo: 'erro', texto: 'Toque em uma linha do código para escolher.' };
      desenhar();
      return;
    }
    const certo = e.escolhida === desafio.linhaBug;
    servico.registrar('bug_tentativa', { desafio: desafio.id, linha: e.escolhida, certo });
    if (certo) {
      terminar();
      return;
    }
    e.erros++;
    e.descartadas.add(e.escolhida);
    e.feedback = {
      tipo: 'erro',
      texto: `A linha ${e.escolhida} está certa. Rastreie com os valores e veja onde o resultado começa a se afastar do esperado.${e.erros >= 2 ? ' Que tal pedir uma dica?' : ''}`,
    };
    e.escolhida = null;
    desenhar();
  }

  function pedirDica() {
    if (e.dicasVistas < desafio.dicas.length) {
      e.dicasVistas++;
      servico.registrar('dica', { desafio: desafio.id, nivel: e.dicasVistas });
      desenhar();
    } else {
      e.revelados++;
      servico.registrar('passo_revelado', { desafio: desafio.id, linha: desafio.linhaBug });
      terminar();
    }
  }

  function terminar() {
    e.fim = Date.now();
    e.estrelas = calcularEstrelas(e);
    servico.salvarResultado(desafio.id, { estrelas: e.estrelas }).catch(console.error);
    servico.registrar('desafio_fim', {
      desafio: desafio.id, semente: e.comBug.semente, modo: 'bug', erros: e.erros,
      dicas: e.dicasVistas, revelados: e.revelados, segundos: Math.round((e.fim - e.inicio) / 1000), estrelas: e.estrelas,
    });
    desenhar();
  }

  function desenhar() {
    const terminou = e.fim != null;
    trocar(raiz, el('div', { class: 'desafio' },
      el('header', { class: 'desafio-topo' },
        el('a', { href: saida, class: 'voltar' }, '← ', trilha.nome),
        el('div', { class: 'desafio-titulo' },
          el('h1', {}, desafio.titulo),
          el('span', { class: 'etiqueta' }, desafio.conceito))),
      el('div', { class: 'desafio-grade' },
        el('section', { class: 'painel-codigo', 'aria-label': 'Código' },
          el('p', { class: 'instrucao' }, el('strong', {}, 'O programa deveria: '), desafio.objetivo),
          el('ol', { class: 'codigo escolha', role: terminou ? null : 'listbox', 'aria-label': 'Escolha a linha com defeito' },
            e.linhas.map((texto, i) => {
              const n = i + 1;
              const classes = [
                n === e.escolhida ? 'escolhida' : '',
                e.descartadas.has(n) ? 'descartada' : '',
                terminou && n === desafio.linhaBug ? 'bug' : '',
              ].join(' ').trim() || null;
              return el('li', { class: classes },
                terminou
                  ? el('code', {}, destacar(texto))
                  : el('button', {
                    type: 'button', class: 'linha-botao', role: 'option',
                    'aria-selected': n === e.escolhida ? 'true' : 'false',
                    disabled: e.descartadas.has(n),
                    onClick: () => { e.escolhida = n; e.feedback = null; desenhar(); },
                  }, el('code', {}, destacar(texto))));
            })),
          terminou ? el('p', { class: 'correcao' }, 'Correção da linha ', desafio.linhaBug, ': ', el('code', {}, e.linhaCorreta.trim())) : null),
        el('section', { class: 'painel-tabela' },
          el('div', { class: 'saidas' },
            el('div', {}, el('h3', {}, 'Saída obtida'), el('pre', { class: 'tela-errada' }, e.obtida.saida || '(nada)')),
            el('div', {}, el('h3', {}, 'Saída esperada'), el('pre', {}, e.esperada.saida || '(nada)'))),
          terminou ? resultado() : acoes(),
          e.dicasVistas ? el('aside', { class: 'dicas' }, el('h2', {}, 'Dicas'),
            el('ol', {}, desafio.dicas.slice(0, e.dicasVistas).map((d) => el('li', {}, d)))) : null))));
  }

  function acoes() {
    return el('div', { class: 'acoes' },
      e.feedback ? el('p', { class: `feedback ${e.feedback.tipo}`, role: 'status' }, e.feedback.texto) : null,
      el('p', { class: 'subtitulo' }, e.escolhida ? `Linha escolhida: ${e.escolhida}` : 'Toque na linha que você acha que tem o defeito.'),
      el('div', { class: 'botoes' }, el('button', { class: 'botao primario', onClick: confirmar }, 'Confirmar linha')),
      el('div', { class: 'botoes secundarios' },
        el('button', { class: 'botao discreto', onClick: pedirDica },
          e.dicasVistas < desafio.dicas.length ? `Dica (${e.dicasVistas + 1} de ${desafio.dicas.length})` : 'Mostrar a resposta'),
        el('button', { class: 'botao discreto', onClick: () => novo() }, 'Novos valores')));
  }

  function resultado() {
    return el('div', { class: 'resultado' },
      el('p', { class: 'estrelas', 'aria-label': `${e.estrelas} de 3 estrelas` },
        '★'.repeat(e.estrelas), el('span', { class: 'apagada' }, '★'.repeat(3 - e.estrelas))),
      el('h2', {}, e.revelados ? 'Este era o bug' : 'Bug encontrado!'),
      el('dl', { class: 'numeros' },
        item('Tentativas erradas', e.erros),
        item('Dicas usadas', e.dicasVistas),
        item('Tempo', formatarTempo(Math.round((e.fim - e.inicio) / 1000)))),
      el('p', { class: 'explicacao' }, desafio.explicacao),
      el('div', { class: 'botoes' },
        proximo
          ? el('a', { class: 'botao primario', href: `#/desafio/${proximo.id}` }, 'Próximo desafio')
          : el('a', { class: 'botao primario', href: saida }, 'Voltar à trilha'),
        el('button', { class: 'botao', onClick: () => novo() }, 'Jogar de novo com outros valores')));
  }

  novo();
}
