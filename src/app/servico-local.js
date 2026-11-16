// Modo local (plano B): perfis com apelido + código de participante, tudo no navegador.
// Os registros saem do aparelho só quando o participante exporta o arquivo.
import { lerLocal, gravarLocal, novoResultado } from './servico.js';

const K_PERFIS = 'rastro.perfis';
const K_ATUAL = 'rastro.perfilAtual';
const kProgresso = (id) => `rastro.progresso.${id}`;
const kEventos = (id) => `rastro.eventos.${id}`;

export function criarServicoLocal() {
  const ouvintes = [];
  let perfis = lerLocal(K_PERFIS, []);
  let atual = perfis.find((p) => p.id === lerLocal(K_ATUAL, null)) ?? null;
  let progresso = atual ? lerLocal(kProgresso(atual.id), {}) : {};

  const avisar = (evento) => ouvintes.forEach((f) => f(evento));
  const salvarPerfis = () => gravarLocal(K_PERFIS, perfis);

  function ativar(perfil) {
    atual = perfil;
    progresso = perfil ? lerLocal(kProgresso(perfil.id), {}) : {};
    gravarLocal(K_ATUAL, perfil?.id ?? null);
    avisar(perfil ? 'SIGNED_IN' : 'SIGNED_OUT');
  }

  return {
    modo: 'local',
    usuario: () => (atual ? { id: atual.id } : null),
    perfil: () => atual,
    progresso: () => progresso,
    aoMudarSessao: (f) => ouvintes.push(f),
    emRecuperacaoDeSenha: () => false,

    listarPerfisLocais: () => perfis.map(({ id, apelido, codigo_participante }) => ({ id, apelido, codigo_participante })),

    async cadastrar({ apelido, codigo }) {
      const perfil = {
        id: crypto.randomUUID(),
        apelido,
        codigo_participante: codigo || null,
        consentiu_em: new Date().toISOString(),
        experiencia: null,
        criado_em: new Date().toISOString(),
      };
      perfis.push(perfil);
      salvarPerfis();
      ativar(perfil);
      return { precisaConfirmarEmail: false };
    },

    async entrar({ perfilId }) {
      const p = perfis.find((x) => x.id === perfilId);
      if (!p) throw new Error('Perfil não encontrado neste aparelho.');
      ativar(p);
    },

    async sair() { ativar(null); },

    async atualizarPerfil(campos) {
      Object.assign(atual, campos);
      salvarPerfis();
    },

    async salvarResultado(desafio, { estrelas }) {
      progresso[desafio] = novoResultado(progresso[desafio], estrelas);
      gravarLocal(kProgresso(atual.id), progresso);
    },

    registrar(tipo, dados = {}) {
      if (!atual) return;
      const eventos = lerLocal(kEventos(atual.id), []);
      eventos.push({ tipo, desafio: dados.desafio ?? null, dados, quando: new Date().toISOString() });
      gravarLocal(kEventos(atual.id), eventos);
    },

    async meusEventos() {
      return lerLocal(kEventos(atual.id), []);
    },

    async apagarMeusDados() {
      const id = atual.id;
      for (const k of [kProgresso(id), kEventos(id)]) {
        try { localStorage.removeItem(k); } catch { /* ignora */ }
      }
      perfis = perfis.filter((p) => p.id !== id);
      salvarPerfis();
      ativar(null);
    },

    async recuperarSenha() {},
    async definirNovaSenha() {},
  };
}
