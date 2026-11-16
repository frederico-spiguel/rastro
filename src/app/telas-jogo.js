// Telas de quem já entrou: menu, trilhas, progresso, como jogar, configurações e pesquisa.
import { CONFIG } from '../config.js';
import { servico } from './servico.js';
import { carregarTrilhas, estadoDasTrilhas, proximoDesafio } from './dados.js';
import { lerPreferencias, salvarPreferencias } from './preferencias.js';
import { el, trocar } from './dom.js';

const ROTULO_ESTADO = { bloqueada: 'Bloqueada', aberta: 'Aberta', concluida: 'Concluída' };

export async function telaMenu(raiz) {
  const trilhas = await carregarTrilhas();
  const progresso = servico.progresso();
  const proximo = proximoDesafio(trilhas, progresso);
  const feitos = trilhas.flatMap((t) => t.desafios).filter((d) => progresso[d.id]?.concluido).length;
  const total = trilhas.reduce((s, t) => s + t.desafios.length, 0);
  const opcao = (href, titulo, texto) => el('li', {}, el('a', { class: 'opcao', href }, el('strong', {}, titulo), el('span', {}, texto)));

  trocar(raiz, el('div', { class: 'pagina' },
    el('h1', {}, `Olá, ${servico.perfil().apelido}`),
    el('p', { class: 'subtitulo' }, `${feitos} de ${total} desafios concluídos.`),
    proximo
      ? el('a', { class: 'botao primario grande', href: `#/desafio/${proximo.id}` }, 'Jogar: ', proximo.titulo)
      : el('p', { class: 'feedback ok' }, 'Você concluiu todos os desafios liberados. 🎉'),
    el('ul', { class: 'menu' },
      opcao('#/trilhas', 'Trilhas e níveis', 'Escolha o que praticar'),
      opcao('#/progresso', 'Meu progresso', 'Desafios concluídos e estrelas'),
      opcao('#/como-jogar', 'Como jogar', 'Tutorial com um desafio de demonstração'),
      opcao('#/pesquisa', 'Pesquisa', 'Testes, questionário e seus dados'),
      opcao('#/config', 'Configurações', 'Tamanho da fonte, contraste e tema')),
  ));
}

export async function telaTrilhas(raiz) {
  const trilhas = await carregarTrilhas();
  const estados = estadoDasTrilhas(trilhas, servico.progresso());
  trocar(raiz, el('div', { class: 'pagina' },
    el('a', { href: '#/menu', class: 'voltar' }, '← Menu'),
    el('h1', {}, 'Trilhas'),
    el('p', { class: 'subtitulo' }, `Conclua ${Math.round(CONFIG.percentualParaDesbloquear * 100)}% dos desafios de uma trilha para liberar a próxima.`),
    el('ul', { class: 'cartoes' }, estados.map((s, i) => {
      const t = s.trilha;
      const conteudo = [
        el('span', { class: 'cartao-numero' }, s.estado === 'bloqueada' ? '🔒' : t.trilha),
        el('span', { class: 'cartao-corpo' },
          el('strong', {}, t.nome, ' ', el('span', { class: `estado ${s.estado}` }, ROTULO_ESTADO[s.estado])),
          el('span', {}, t.descricao),
          el('span', { class: 'contagem' }, s.estado === 'bloqueada' && t.liberaCom
            ? `Abre junto com a trilha ${t.liberaCom}`
            : s.estado === 'bloqueada'
            ? `Conclua ${estados[i - 1].precisaParaLiberarProxima} desafios da trilha ${estados[i - 1].trilha.trilha} para liberar`
            : `${s.feitos} de ${s.total} concluídos`),
          el('span', { class: 'barra' }, el('span', { style: `width:${(100 * s.feitos) / s.total}%` }))),
      ];
      return el('li', {}, s.estado === 'bloqueada'
        ? el('div', { class: 'cartao bloqueado', 'aria-disabled': 'true' }, conteudo)
        : el('a', { class: 'cartao', href: `#/trilha/${t.trilha}` }, conteudo));
    }))));
}

export async function telaTrilha(raiz, numero) {
  const trilhas = await carregarTrilhas();
  const s = estadoDasTrilhas(trilhas, servico.progresso()).find((x) => x.trilha.trilha === numero);
  if (!s) throw new Error('Trilha não encontrada.');
  if (s.estado === 'bloqueada') { location.hash = '#/trilhas'; return; }
  const t = s.trilha;
  const prog = servico.progresso();
  trocar(raiz, el('div', { class: 'pagina' },
    el('a', { href: '#/trilhas', class: 'voltar' }, '← Trilhas'),
    el('h1', {}, `Trilha ${t.trilha}: ${t.nome}`),
    el('p', { class: 'subtitulo' }, t.descricao),
    el('ol', { class: 'lista-desafios' }, t.desafios.map((d) => {
      const p = prog[d.id];
      return el('li', {},
        el('a', { href: `#/desafio/${d.id}`, class: p?.concluido ? 'concluido' : null },
          el('span', { class: 'titulo' }, d.titulo),
          el('span', { class: 'etiqueta' }, d.conceito),
          el('span', { class: 'nivel', 'aria-label': `dificuldade ${d.dificuldade} de 3` }, '●'.repeat(d.dificuldade) + '○'.repeat(3 - d.dificuldade)),
          el('span', { class: 'estrelas-mini', 'aria-label': p ? `${p.estrelas} de 3 estrelas` : 'não feito' },
            p ? '★'.repeat(p.estrelas) + '☆'.repeat(3 - p.estrelas) : '☆☆☆')));
    }))));
}

export async function telaProgresso(raiz) {
  const trilhas = await carregarTrilhas();
  const prog = servico.progresso();
  const estados = estadoDasTrilhas(trilhas, prog);
  const estrelas = Object.values(prog).reduce((s, p) => s + p.estrelas, 0);
  trocar(raiz, el('div', { class: 'pagina' },
    el('a', { href: '#/menu', class: 'voltar' }, '← Menu'),
    el('h1', {}, 'Meu progresso'),
    el('p', { class: 'subtitulo' }, `${estrelas} estrelas no total. Aqui você só se compara com você mesmo.`),
    estados.map((s) => el('section', { class: 'bloco-progresso' },
      el('h2', {}, `Trilha ${s.trilha.trilha}: ${s.trilha.nome} `, el('span', { class: `estado ${s.estado}` }, ROTULO_ESTADO[s.estado])),
      el('span', { class: 'barra' }, el('span', { style: `width:${(100 * s.feitos) / s.total}%` })),
      el('ul', { class: 'mini-lista' }, s.trilha.desafios.map((d) => {
        const p = prog[d.id];
        return el('li', { class: p ? 'feito' : null },
          el('span', {}, d.titulo),
          el('span', { class: 'estrelas-mini' }, p ? '★'.repeat(p.estrelas) + '☆'.repeat(3 - p.estrelas) : '—'),
          p && p.vezes > 1 ? el('small', {}, `${p.vezes}×`) : null);
      })))),
  ));
}

export function telaComoJogar(raiz) {
  const primeiraVez = !servico.progresso()['t0-01'];
  trocar(raiz, el('div', { class: 'pagina estreita' },
    primeiraVez ? null : el('a', { href: '#/menu', class: 'voltar' }, '← Menu'),
    el('h1', {}, 'Como jogar'),
    el('ol', { class: 'passos-tutorial' },
      el('li', {}, el('strong', {}, 'Leia a linha destacada. '), 'É a próxima linha que o computador vai executar.'),
      el('li', {}, el('strong', {}, 'Preencha a tabela. '), 'Cada coluna é uma variável. Escreva o valor dela depois da linha. Os valores anteriores já vêm preenchidos: mude só o que a linha altera.'),
      el('li', {}, el('strong', {}, 'Em if e while, '), 'diga se a condição é verdadeira ou falsa. Em for, diga se ele pega mais um valor.'),
      el('li', {}, el('strong', {}, 'Em print, '), 'escreva o que aparece na tela.'),
      el('li', {}, el('strong', {}, 'Errou? '), 'O jogo mostra em que linha seu rastro divergiu. Peça dicas se precisar.'),
      el('li', {}, el('strong', {}, 'A cada tentativa os números mudam, '), 'então não adianta decorar: é preciso executar.')),
    el('a', { class: 'botao primario', href: '#/desafio/t0-01' }, primeiraVez ? 'Fazer o desafio de demonstração' : 'Refazer a demonstração'),
  ));
}

export function telaConfig(raiz) {
  const p = lerPreferencias();
  const grupo = (titulo, nome, opcoes) => el('fieldset', { class: 'pergunta' },
    el('legend', {}, titulo),
    opcoes.map(([valor, rotulo]) => el('label', {},
      el('input', {
        type: 'radio', name: nome, value: valor, checked: String(p[nome]) === String(valor),
        onChange: () => { p[nome] = typeof p[nome] === 'boolean' ? valor === 'true' : valor; salvarPreferencias(p); },
      }), ' ', rotulo)));
  trocar(raiz, el('div', { class: 'pagina estreita' },
    el('a', { href: '#/menu', class: 'voltar' }, '← Menu'),
    el('h1', {}, 'Configurações'),
    el('p', { class: 'subtitulo' }, 'Valem para este aparelho.'),
    grupo('Tamanho da fonte', 'fonte', [['normal', 'Normal'], ['grande', 'Grande']]),
    grupo('Contraste', 'contraste', [['false', 'Normal'], ['true', 'Alto']]),
    grupo('Tema', 'tema', [['auto', 'Igual ao do aparelho'], ['claro', 'Claro'], ['escuro', 'Escuro']]),
  ));
}

export function telaPesquisa(raiz) {
  const perfil = servico.perfil();
  const link = (url, rotulo) => (url
    ? el('a', { class: 'botao', href: url, target: '_blank', rel: 'noopener' }, rotulo)
    : el('span', { class: 'etiqueta' }, `${rotulo}: link ainda não disponível`));
  const msg = el('p', { class: 'feedback', role: 'status', hidden: true });

  async function baixar(formato) {
    const eventos = await servico.meusEventos();
    const conteudo = formato === 'json'
      ? JSON.stringify({ perfil: { apelido: perfil.apelido, codigo_participante: perfil.codigo_participante }, eventos }, null, 2)
      : paraCsv(eventos, perfil);
    const blob = new Blob([conteudo], { type: formato === 'json' ? 'application/json' : 'text/csv' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `rastro-${perfil.codigo_participante || perfil.apelido}.${formato}` });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  trocar(raiz, el('div', { class: 'pagina estreita' },
    el('a', { href: '#/menu', class: 'voltar' }, '← Menu'),
    el('h1', {}, 'Pesquisa'),
    el('p', {}, 'Seu código de participante: ', el('strong', {}, perfil.codigo_participante || '(nenhum)'),
      '. Use o mesmo código nos testes e no questionário.'),
    el('ol', { class: 'passos-pesquisa' },
      el('li', {}, el('strong', {}, 'Antes de jogar: '), link(CONFIG.links.preTeste, 'Pré-teste')),
      el('li', {}, el('strong', {}, 'Jogue por cerca de 30 minutos. '), el('a', { href: '#/menu' }, 'Ir para o jogo')),
      el('li', {}, el('strong', {}, 'Depois de jogar: '), link(CONFIG.links.posTeste, 'Pós-teste'), ' ', link(CONFIG.links.meega, 'Questionário MEEGA+'))),
    el('h2', {}, 'Seus dados'),
    el('p', {}, servico.modo === 'supabase'
      ? 'Os registros do jogo são enviados automaticamente. Você pode baixar uma cópia ou apagar tudo.'
      : 'Os registros ficam neste aparelho. Ao terminar, baixe o arquivo e envie para a dupla.'),
    el('div', { class: 'botoes' },
      el('button', { class: 'botao', onClick: () => baixar('csv') }, 'Baixar registros (CSV)'),
      el('button', { class: 'botao', onClick: () => baixar('json') }, 'Baixar registros (JSON)')),
    el('details', { class: 'zona-perigo' },
      el('summary', {}, 'Apagar meus dados'),
      el('p', {}, 'Isso apaga seu perfil, progresso e registros do jogo. Não dá para desfazer.'),
      el('button', {
        class: 'botao perigo',
        onClick: async () => {
          if (!window.confirm('Apagar todos os seus dados do Rastro? Não dá para desfazer.')) return;
          try {
            await servico.apagarMeusDados();
            location.hash = '#/';
          } catch (e) {
            msg.textContent = e.message;
            msg.className = 'feedback erro';
            msg.hidden = false;
          }
        },
      }, 'Apagar tudo')),
    msg,
  ));
}

function paraCsv(eventos, perfil) {
  const esc = (v) => {
    const s = v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [['codigo_participante', 'quando', 'tipo', 'desafio', 'linha', 'comando', 'dados']];
  for (const e of eventos) {
    linhas.push([perfil.codigo_participante, e.quando, e.tipo, e.desafio, e.dados?.linha, e.dados?.comando, e.dados]);
  }
  return linhas.map((l) => l.map(esc).join(',')).join('\n');
}
