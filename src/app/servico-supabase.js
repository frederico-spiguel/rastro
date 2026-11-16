// Back-end com Supabase: login por e-mail e senha, progresso e registros no banco.
// Os registros entram numa fila local e são enviados em lotes (não se perdem se a
// internet cair no meio do desafio).
import { lerLocal, gravarLocal, novoResultado } from './servico.js';

const K_FILA = 'rastro.fila';

const TRADUCOES = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
  [/already registered|already been registered/i, 'Já existe uma conta com este e-mail. Use "Entrar".'],
  [/password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/unable to validate email|invalid email/i, 'Este e-mail não parece válido.'],
  [/rate limit|too many/i, 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'],
  [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique a internet.'],
];

function traduzir(erro) {
  const msg = erro?.message ?? String(erro);
  const t = TRADUCOES.find(([re]) => re.test(msg));
  return new Error(t ? t[1] : `Erro do servidor: ${msg}`);
}

function enderecoDoSite() {
  return `${location.origin}${location.pathname}`;
}

// `createClient` vem da biblioteca supabase-js (o teste automático passa um banco simulado).
export async function criarServicoSupabase(cfg, createClient) {
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseChaveAnon, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const ouvintes = [];
  let usuario = null;
  let perfil = null;
  let progresso = {};
  let recuperacao = false;
  let fila = lerLocal(K_FILA, []);
  let enviando = false;

  // Carrega perfil e progresso da sessão. Chamadas repetidas para o mesmo usuário
  // reaproveitam a mesma carga (o aviso de login do Supabase chega junto com o cadastro).
  let carga = { id: undefined, promessa: null };
  function carregar(sessao) {
    const id = sessao?.user?.id ?? null;
    if (carga.id === id && carga.promessa) return carga.promessa;
    const promessa = carregarAgora(sessao).catch((e) => {
      carga = { id: undefined, promessa: null };
      throw e;
    });
    carga = { id, promessa };
    return promessa;
  }

  async function carregarAgora(sessao) {
    usuario = sessao?.user ? { id: sessao.user.id, email: sessao.user.email } : null;
    perfil = null;
    progresso = {};
    if (!usuario) return;

    let r = await sb.from('perfis').select('*').eq('id', usuario.id).maybeSingle();
    if (r.error) throw traduzir(r.error);
    if (!r.data) {
      // Primeiro login: cria o perfil com os dados informados no cadastro.
      const md = sessao.user.user_metadata ?? {};
      r = await sb.from('perfis').insert({
        id: usuario.id,
        apelido: md.apelido || 'Jogador',
        codigo_participante: md.codigo_participante || null,
        consentiu_em: md.consentiu_em || new Date().toISOString(),
      }).select().single();
      if (r.error) throw traduzir(r.error);
    }
    perfil = r.data;

    const p = await sb.from('progresso').select('desafio, estrelas, vezes');
    if (p.error) throw traduzir(p.error);
    progresso = Object.fromEntries(p.data.map((x) => [x.desafio, { concluido: true, estrelas: x.estrelas, vezes: x.vezes }]));
  }

  const { data } = await sb.auth.getSession();
  await carregar(data.session);
  if (new URLSearchParams(location.search).has('code')) {
    history.replaceState(null, '', enderecoDoSite() + location.hash);
  }

  sb.auth.onAuthStateChange((evento, sessao) => {
    if (evento === 'PASSWORD_RECOVERY') recuperacao = true;
    const mudouUsuario = (sessao?.user?.id ?? null) !== carga.id;
    if (!mudouUsuario && evento !== 'PASSWORD_RECOVERY') return;
    // Não chamar o Supabase dentro deste callback (recomendação da biblioteca).
    // Usa sempre a sessão ATUAL: um aviso atrasado ("saiu") não pode desfazer um login novo.
    setTimeout(async () => {
      try {
        if (mudouUsuario) {
          const { data: atual } = await sb.auth.getSession();
          await carregar(atual.session);
        }
      } catch (e) {
        console.error(e);
      }
      ouvintes.forEach((f) => f(evento));
    }, 0);
  });

  async function enviarFila() {
    if (enviando || !usuario) return;
    const lote = fila.filter((e) => e.usuario === usuario.id).slice(0, 200);
    if (!lote.length) return;
    enviando = true;
    try {
      const { error } = await sb.from('eventos').insert(lote.map(({ id_local: _, ...e }) => e));
      if (!error) {
        const enviados = new Set(lote.map((e) => e.id_local));
        fila = fila.filter((e) => !enviados.has(e.id_local));
        gravarLocal(K_FILA, fila);
      }
    } finally {
      enviando = false;
    }
  }
  const timer = setInterval(enviarFila, 5000);
  timer?.unref?.();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviarFila();
  });

  return {
    modo: 'supabase',
    usuario: () => usuario,
    perfil: () => perfil,
    progresso: () => progresso,
    aoMudarSessao: (f) => ouvintes.push(f),
    emRecuperacaoDeSenha: () => recuperacao,

    async cadastrar({ email, senha, apelido, codigo }) {
      const { data: d, error } = await sb.auth.signUp({
        email,
        password: senha,
        options: {
          emailRedirectTo: enderecoDoSite(),
          data: { apelido, codigo_participante: codigo || null, consentiu_em: new Date().toISOString() },
        },
      });
      if (error) throw traduzir(error);
      if (d.user && Array.isArray(d.user.identities) && d.user.identities.length === 0) {
        throw new Error('Já existe uma conta com este e-mail. Use "Entrar".');
      }
      if (d.session) await carregar(d.session);
      return { precisaConfirmarEmail: !d.session };
    },

    async entrar({ email, senha }) {
      const { data: d, error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw traduzir(error);
      await carregar(d.session);
    },

    async sair() {
      await enviarFila();
      await sb.auth.signOut();
      await carregar(null);
    },

    async atualizarPerfil(campos) {
      const { data: d, error } = await sb.from('perfis').update(campos).eq('id', usuario.id).select().single();
      if (error) throw traduzir(error);
      perfil = d;
    },

    async salvarResultado(desafio, { estrelas }) {
      const novo = novoResultado(progresso[desafio], estrelas);
      progresso[desafio] = novo;
      const { error } = await sb.from('progresso').upsert({
        usuario: usuario.id, desafio, estrelas: novo.estrelas, vezes: novo.vezes,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'usuario,desafio' });
      if (error) console.error(error);
    },

    registrar(tipo, dados = {}) {
      if (!usuario) return;
      fila.push({
        id_local: crypto.randomUUID(),
        usuario: usuario.id,
        tipo,
        desafio: dados.desafio ?? null,
        dados,
        quando: new Date().toISOString(),
      });
      gravarLocal(K_FILA, fila);
    },

    async meusEventos() {
      await enviarFila();
      const { data: d, error } = await sb.from('eventos')
        .select('tipo, desafio, dados, quando').order('quando').limit(20000);
      if (error) throw traduzir(error);
      const pendentes = fila.filter((e) => e.usuario === usuario.id)
        .map(({ tipo, desafio, dados, quando }) => ({ tipo, desafio, dados, quando }));
      return [...d, ...pendentes];
    },

    async apagarMeusDados() {
      fila = fila.filter((e) => e.usuario !== usuario.id);
      gravarLocal(K_FILA, fila);
      for (const tabela of ['eventos', 'progresso']) {
        const { error } = await sb.from(tabela).delete().eq('usuario', usuario.id);
        if (error) throw traduzir(error);
      }
      const { error } = await sb.from('perfis').delete().eq('id', usuario.id);
      if (error) throw traduzir(error);
      await sb.auth.signOut();
      await carregar(null);
    },

    async recuperarSenha(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: enderecoDoSite() });
      if (error) throw traduzir(error);
    },

    async definirNovaSenha(senha) {
      const { error } = await sb.auth.updateUser({ password: senha });
      if (error) throw traduzir(error);
      recuperacao = false;
    },
  };
}
