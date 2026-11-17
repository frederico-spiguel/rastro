// Termo de consentimento (revisado e aprovado pelo professor em 16/11/2026).
import { CONFIG } from '../config.js';
import { el } from './dom.js';

export function textoDoTermo(modo) {
  const coleta = modo === 'supabase'
    ? 'seu e-mail (usado apenas para entrar no jogo; não aparece nos dados da pesquisa), um apelido, o código de participante e os registros de uso do jogo'
    : 'um apelido, o código de participante e os registros de uso do jogo, guardados neste aparelho';
  return el('div', { class: 'termo' },
    el('h2', {}, 'Termo de consentimento livre e esclarecido'),
    el('p', {}, 'Você está sendo convidado(a) a participar de um estudo da disciplina de tecnologia educacional, conduzido por Izadora Queiros e Frederico Spiguel, que avalia o Rastro, um jogo para treinar teste de mesa em programação.'),
    el('h3', {}, 'O que você vai fazer'),
    el('p', {}, 'Responder a um teste curto (formulário online) antes e depois de jogar, jogar por cerca de 30 minutos e responder a um questionário sobre a experiência. Tempo total aproximado: 1 hora.'),
    el('h3', {}, 'Que dados são coletados'),
    el('p', {}, `Coletamos ${coleta}: tentativas, erros, tempo e dicas usadas em cada desafio. Não coletamos nome, CPF nem outros dados pessoais.`),
    el('h3', {}, 'Como os dados são usados'),
    el('p', {}, 'Os dados são analisados de forma agrupada e anônima, apenas para o trabalho da disciplina. Nenhum participante será identificado em relatórios ou apresentações.'),
    el('h3', {}, 'Riscos e benefícios'),
    el('p', {}, 'Os riscos são mínimos (por exemplo, cansaço ou desconforto ao errar um desafio). O benefício é praticar uma habilidade importante para as disciplinas de programação.'),
    el('h3', {}, 'Participação voluntária'),
    el('p', {}, 'A participação é voluntária e não vale nota. Você pode parar a qualquer momento, sem prejuízo, e pedir a exclusão dos seus dados (há um botão para isso em "Pesquisa").'),
    el('h3', {}, 'Contato'),
    el('p', {}, `Dúvidas: ${CONFIG.contato}.`),
  );
}
