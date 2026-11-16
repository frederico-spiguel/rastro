// Telas de acesso: início, cadastro (com termo), entrar, nova senha e perfil inicial.
import { servico } from './servico.js';
import { textoDoTermo } from './termo.js';
import { el, trocar } from './dom.js';

// Depois de entrar: questionário (1ª vez) -> tutorial (1ª vez) -> menu.
export function destinoInicial() {
  const perfil = servico.perfil();
  if (!perfil) return '#/';
  if (!perfil.experiencia) return '#/perfil-inicial';
  if (!servico.progresso()['t0-01']) return '#/como-jogar';
  return '#/menu';
}

// Formulário com envio assíncrono, botão desabilitado e mensagem de erro.
function formulario({ aoEnviar, rotulo }, ...campos) {
  const msg = el('p', { class: 'feedback erro', role: 'alert', hidden: true });
  const botao = el('button', { class: 'botao primario', type: 'submit' }, rotulo);
  const form = el('form', {
    class: 'formulario',
    novalidate: true,
    onSubmit: async (ev) => {
      ev.preventDefault();
      msg.hidden = true;
      botao.disabled = true;
      try {
        await aoEnviar(new FormData(form), form);
      } catch (e) {
        msg.textContent = e.message;
        msg.hidden = false;
      } finally {
        botao.disabled = false;
      }
    },
  }, campos, msg, botao);
  return form;
}

function campo(rotulo, props, ajuda) {
  const id = `campo-${props.name}`;
  return el('div', { class: 'campo-form' },
    el('label', { for: id }, rotulo),
    el('input', { id, class: 'campo', ...props }),
    ajuda ? el('small', {}, ajuda) : null);
}

export function telaInicio(raiz) {
  trocar(raiz, el('div', { class: 'inicio' },
    el('div', { class: 'inicio-texto' },
      el('h1', {}, 'Execute o código de cabeça.', el('br'), 'Linha a linha.'),
      el('p', { class: 'subtitulo' }, 'O Rastro é um jogo para treinar o teste de mesa: você acompanha como as variáveis mudam enquanto um programa em Python é executado, e o jogo confere cada passo na hora.'),
      el('div', { class: 'botoes' },
        el('a', { class: 'botao primario', href: '#/cadastro' }, 'Criar conta'),
        el('a', { class: 'botao', href: '#/entrar' }, 'Já tenho conta'))),
    el('div', { class: 'inicio-exemplo', 'aria-hidden': 'true' },
      el('pre', { class: 'mini-codigo' }, 'x = 3\ny = x * 2\nx = y - 1'),
      el('table', { class: 'mesa mini' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Linha'), el('th', {}, 'x'), el('th', {}, 'y'))),
        el('tbody', {},
          el('tr', {}, el('td', {}, '1'), el('td', { class: 'mudou' }, '3'), el('td', {}, '')),
          el('tr', {}, el('td', {}, '2'), el('td', { class: 'igual' }, '3'), el('td', { class: 'mudou' }, '6')),
          el('tr', {}, el('td', {}, '3'), el('td', { class: 'mudou' }, '5'), el('td', { class: 'igual' }, '6'))))),
  ));
}

export function telaCadastro(raiz) {
  const local = servico.modo === 'local';
  const camposConta = local ? [] : [
    campo('E-mail', { name: 'email', type: 'email', autocomplete: 'email', required: true }),
    campo('Senha', { name: 'senha', type: 'password', autocomplete: 'new-password', minlength: 6, required: true }, 'Pelo menos 6 caracteres.'),
  ];
  trocar(raiz, el('div', { class: 'pagina estreita' },
    el('a', { href: '#/', class: 'voltar' }, '← Início'),
    el('h1', {}, 'Criar conta'),
    local ? el('p', { class: 'subtitulo' }, 'Seu perfil fica salvo neste aparelho. Use sempre o mesmo navegador.') : null,
    formulario({
      rotulo: 'Criar conta e começar',
      async aoEnviar(dados) {
        const apelido = String(dados.get('apelido') ?? '').trim();
        const codigo = String(dados.get('codigo') ?? '').trim();
        if (apelido.length < 2 || apelido.length > 30) throw new Error('O apelido deve ter de 2 a 30 caracteres.');
        if (codigo.length > 30) throw new Error('O código de participante é longo demais.');
        if (!dados.get('aceite')) throw new Error('Para participar, é preciso ler e aceitar o termo.');
        const email = String(dados.get('email') ?? '').trim();
        const senha = String(dados.get('senha') ?? '');
        if (!local && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.');
        if (!local && senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        const r = await servico.cadastrar({ email, senha, apelido, codigo });
        if (r.precisaConfirmarEmail) {
          trocar(raiz, el('div', { class: 'pagina estreita' },
            el('h1', {}, 'Confirme seu e-mail'),
            el('p', {}, `Enviamos um link para ${email}. Abra o e-mail, clique no link e você volta direto para o jogo.`),
            el('p', { class: 'subtitulo' }, 'Não chegou? Olhe a caixa de spam.'),
            el('a', { class: 'botao', href: '#/entrar' }, 'Ir para Entrar')));
          return;
        }
        location.hash = destinoInicial();
      },
    },
    camposConta,
    campo('Apelido', { name: 'apelido', autocomplete: 'nickname', required: true, maxlength: 30 }, 'Como o jogo vai te chamar. Não use seu nome completo.'),
    campo('Código de participante (opcional)', { name: 'codigo', autocomplete: 'off', maxlength: 30 }, 'Se você recebeu um código para a pesquisa, digite aqui. Ele liga o jogo aos testes.'),
    el('div', { class: 'caixa-termo', tabindex: '0', 'aria-label': 'Termo de consentimento' }, textoDoTermo(servico.modo)),
    el('label', { class: 'aceite' },
      el('input', { type: 'checkbox', name: 'aceite', value: 'sim' }),
      ' Li o termo e aceito participar.')),
  ));
}

export function telaEntrar(raiz) {
  if (servico.modo === 'local') {
    const perfis = servico.listarPerfisLocais();
    trocar(raiz, el('div', { class: 'pagina estreita' },
      el('a', { href: '#/', class: 'voltar' }, '← Início'),
      el('h1', {}, 'Entrar'),
      perfis.length
        ? el('ul', { class: 'lista-perfis' }, perfis.map((p) => el('li', {},
          el('button', {
            class: 'botao perfil',
            onClick: async () => { await servico.entrar({ perfilId: p.id }); location.hash = destinoInicial(); },
          }, el('strong', {}, p.apelido), p.codigo_participante ? el('span', {}, p.codigo_participante) : null))))
        : el('p', {}, 'Nenhum perfil neste aparelho ainda.'),
      el('a', { class: 'botao', href: '#/cadastro' }, 'Criar novo perfil')));
    return;
  }

  trocar(raiz, el('div', { class: 'pagina estreita' },
    el('a', { href: '#/', class: 'voltar' }, '← Início'),
    el('h1', {}, 'Entrar'),
    formulario({
      rotulo: 'Entrar',
      async aoEnviar(dados) {
        await servico.entrar({ email: String(dados.get('email')).trim(), senha: String(dados.get('senha')) });
        location.hash = destinoInicial();
      },
    },
    campo('E-mail', { name: 'email', type: 'email', autocomplete: 'email', required: true }),
    campo('Senha', { name: 'senha', type: 'password', autocomplete: 'current-password', required: true })),
    el('p', {}, el('a', { href: '#/esqueci' }, 'Esqueci minha senha')),
    el('p', {}, 'Não tem conta? ', el('a', { href: '#/cadastro' }, 'Criar conta')),
  ));
}

export function telaEsqueci(raiz) {
  trocar(raiz, el('div', { class: 'pagina estreita' },
    el('a', { href: '#/entrar', class: 'voltar' }, '← Entrar'),
    el('h1', {}, 'Recuperar senha'),
    formulario({
      rotulo: 'Enviar link',
      async aoEnviar(dados, form) {
        await servico.recuperarSenha(String(dados.get('email')).trim());
        form.replaceWith(el('p', { class: 'feedback ok' }, 'Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha.'));
      },
    },
    campo('E-mail', { name: 'email', type: 'email', autocomplete: 'email', required: true })),
  ));
}

export function telaNovaSenha(raiz) {
  trocar(raiz, el('div', { class: 'pagina estreita' },
    el('h1', {}, 'Nova senha'),
    formulario({
      rotulo: 'Salvar senha',
      async aoEnviar(dados) {
        const s = String(dados.get('senha'));
        if (s.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        await servico.definirNovaSenha(s);
        location.hash = destinoInicial();
      },
    },
    campo('Nova senha', { name: 'senha', type: 'password', autocomplete: 'new-password', minlength: 6, required: true })),
  ));
}

const PERGUNTAS = [
  ['disciplina', 'Você já cursou ou está cursando Algoritmos / Programação I?',
    [['cursando', 'Estou cursando'], ['cursei', 'Já cursei'], ['nao', 'Não']]],
  ['tempo', 'Há quanto tempo você programa?',
    [['nunca', 'Nunca programei'], ['menos6m', 'Menos de 6 meses'], ['6m2a', 'De 6 meses a 2 anos'], ['mais2a', 'Mais de 2 anos']]],
  ['testeDeMesa', 'Você já tinha feito teste de mesa antes?',
    [['nunca', 'Nunca'], ['poucas', 'Poucas vezes'], ['muitas', 'Muitas vezes']]],
];

export function telaPerfilInicial(raiz) {
  trocar(raiz, el('div', { class: 'pagina estreita' },
    el('h1', {}, `Olá, ${servico.perfil().apelido}!`),
    el('p', { class: 'subtitulo' }, 'Três perguntas rápidas sobre sua experiência (opcional). Isso ajuda a interpretar os resultados da pesquisa.'),
    formulario({
      rotulo: 'Continuar',
      async aoEnviar(dados) {
        const experiencia = Object.fromEntries(PERGUNTAS.map(([k]) => [k, dados.get(k) || null]));
        await servico.atualizarPerfil({ experiencia });
        location.hash = destinoInicial();
      },
    },
    PERGUNTAS.map(([nome, pergunta, opcoes]) => el('fieldset', { class: 'pergunta' },
      el('legend', {}, pergunta),
      opcoes.map(([valor, rotulo]) => el('label', {},
        el('input', { type: 'radio', name: nome, value: valor }), ' ', rotulo))))),
    el('button', {
      class: 'botao discreto',
      onClick: async () => { await servico.atualizarPerfil({ experiencia: { pulou: true } }); location.hash = destinoInicial(); },
    }, 'Pular'),
  ));
}
