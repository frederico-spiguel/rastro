// Navegação por hash. Rotas públicas: #/, #/cadastro, #/entrar, #/esqueci.
// As demais exigem estar logado.
import { iniciarServico, servico } from './servico.js';
import { carregarTodas, carregarTrilhas, acharDesafio, estadoDasTrilhas } from './dados.js';
import { aplicarPreferencias } from './preferencias.js';
import {
  telaInicio, telaCadastro, telaEntrar, telaEsqueci, telaNovaSenha, telaPerfilInicial, destinoInicial,
} from './telas-conta.js';
import {
  telaMenu, telaTrilhas, telaTrilha, telaProgresso, telaComoJogar, telaConfig, telaPesquisa,
} from './telas-jogo.js';
import { telaDesafio } from './desafio.js';
import { telaBug } from './bug.js';
import { el, trocar } from './dom.js';

const raiz = document.getElementById('app');
const areaUsuario = document.getElementById('usuario');

const PUBLICAS = {
  '': telaInicio,
  cadastro: telaCadastro,
  entrar: telaEntrar,
  esqueci: telaEsqueci,
};

const PRIVADAS = {
  menu: telaMenu,
  trilhas: telaTrilhas,
  trilha: (r, n) => telaTrilha(r, Number(n)),
  desafio: abrirDesafio,
  progresso: telaProgresso,
  'como-jogar': telaComoJogar,
  config: telaConfig,
  pesquisa: telaPesquisa,
  'perfil-inicial': telaPerfilInicial,
  'nova-senha': telaNovaSenha,
};

async function rotear() {
  const [rota, arg] = location.hash.replace(/^#\/?/, '').split('/');
  desenharTopo();
  try {
    if (servico.emRecuperacaoDeSenha() && rota !== 'nova-senha') {
      location.hash = '#/nova-senha';
      return;
    }
    const logado = !!servico.perfil();
    if (rota in PUBLICAS) {
      if (logado) { location.hash = destinoInicial(); return; }
      await PUBLICAS[rota](raiz);
    } else if (rota in PRIVADAS) {
      if (!logado) { location.hash = '#/'; return; }
      await PRIVADAS[rota](raiz, arg);
    } else {
      location.hash = '#/';
      return;
    }
  } catch (erro) {
    mostrarErro(erro);
  }
  window.scrollTo(0, 0);
}

async function abrirDesafio(r, id) {
  const achado = await acharDesafio(id);
  if (!achado) throw new Error('Desafio não encontrado.');
  if (achado.trilha.trilha > 0) {
    const estado = estadoDasTrilhas(await carregarTrilhas(), servico.progresso())
      .find((s) => s.trilha.trilha === achado.trilha.trilha);
    if (estado.estado === 'bloqueada') { location.hash = '#/trilhas'; return; }
  }
  if (achado.desafio.modo === 'bug') telaBug(r, achado);
  else telaDesafio(r, achado);
}

function desenharTopo() {
  const perfil = servico.perfil();
  trocar(areaUsuario, perfil
    ? [
      el('a', { href: '#/menu', class: 'topo-link' }, 'Menu'),
      el('span', { class: 'topo-apelido' }, perfil.apelido),
      el('button', {
        class: 'botao discreto',
        onClick: async () => { await servico.sair(); location.hash = '#/'; },
      }, servico.modo === 'local' ? 'Trocar perfil' : 'Sair'),
    ]
    : []);
}

function mostrarErro(erro) {
  console.error(erro);
  trocar(raiz, el('div', { class: 'pagina estreita' },
    el('h1', {}, 'Algo deu errado'),
    el('p', {}, erro.message),
    el('a', { class: 'botao', href: '#/' }, 'Voltar ao início')));
}

async function iniciar() {
  aplicarPreferencias();
  try {
    await iniciarServico();
    await carregarTodas();
  } catch (erro) {
    mostrarErro(erro);
    return;
  }
  servico.aoMudarSessao(() => {
    const rota = location.hash.replace(/^#\/?/, '').split('/')[0];
    if (servico.emRecuperacaoDeSenha()) location.hash = '#/nova-senha';
    else if (servico.perfil() && rota in PUBLICAS) location.hash = destinoInicial();
    else rotear();
  });
  window.addEventListener('hashchange', rotear);
  rotear();
}

iniciar();
