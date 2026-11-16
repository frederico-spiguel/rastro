// Supabase simulado em memória, só com o que o Rastro usa. Imita as regras de acesso (RLS)
// do sql/schema.sql: cada usuário só enxerga e altera as próprias linhas.
const COLUNAS = {
  perfis: ['id', 'apelido', 'codigo_participante', 'consentiu_em', 'experiencia', 'criado_em'],
  progresso: ['usuario', 'desafio', 'estrelas', 'vezes', 'atualizado_em'],
  eventos: ['id', 'usuario', 'tipo', 'desafio', 'dados', 'quando'],
};
const CHAVE = { perfis: ['id'], progresso: ['usuario', 'desafio'], eventos: ['id'] };

const copia = (x) => JSON.parse(JSON.stringify(x));

export function criarSupabaseFalso({ confirmarEmail = false } = {}) {
  const db = { perfis: [], progresso: [], eventos: [] };
  const usuarios = [];
  const ouvintes = [];
  let sessao = null;
  let seq = 1;

  const emitir = (evento) => ouvintes.forEach((f) => f(evento, sessao));
  const abrirSessao = (u) => {
    sessao = { user: { id: u.id, email: u.email, user_metadata: u.user_metadata } };
  };
  const dono = (tabela, linha) => (tabela === 'perfis' ? linha.id : linha.usuario) === sessao?.user.id;

  function validar(tabela, linha) {
    for (const c of Object.keys(linha)) {
      if (!COLUNAS[tabela].includes(c)) return `column "${c}" of relation "${tabela}" does not exist`;
    }
    if (tabela === 'perfis' && !(linha.apelido?.length >= 2 && linha.apelido.length <= 30)) return 'violates check constraint (apelido)';
    if (!dono(tabela, linha)) return 'new row violates row-level security policy';
    return null;
  }

  function comPadroes(tabela, linha) {
    const agora = new Date().toISOString();
    if (tabela === 'eventos') return { id: seq++, usuario: sessao.user.id, quando: agora, ...linha };
    if (tabela === 'progresso') return { usuario: sessao.user.id, atualizado_em: agora, estrelas: 0, vezes: 0, ...linha };
    return { criado_em: agora, experiencia: null, codigo_participante: null, ...linha };
  }

  const mesmaChave = (tabela, a, b, chave = CHAVE[tabela]) => chave.every((k) => a[k] === b[k]);

  class Consulta {
    constructor(tabela) {
      this.t = tabela;
      this.op = null;
      this.filtros = [];
      this.retornar = false;
      this.modo = null;
    }
    select() { if (this.op) this.retornar = true; else this.op = 'select'; return this; }
    insert(d) { this.op = 'insert'; this.dados = d; return this; }
    update(d) { this.op = 'update'; this.dados = d; return this; }
    upsert(d, o = {}) { this.op = 'upsert'; this.dados = d; this.conflito = o.onConflict?.split(','); return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.filtros.push((r) => r[c] === v); return this; }
    order(c) { this.ordem = c; return this; }
    limit(n) { this.limite = n; return this; }
    maybeSingle() { this.modo = 'maybe'; return this; }
    single() { this.modo = 'single'; return this; }
    then(ok, falha) { return Promise.resolve().then(() => this.executar()).then(ok, falha); }

    executar() {
      if (!sessao) return { data: null, error: { message: 'JWT expired or missing' } };
      const tab = db[this.t];
      const visiveis = () => tab.filter((r) => dono(this.t, r) && this.filtros.every((f) => f(r)));
      let afetadas = [];
      if (this.op === 'select') {
        afetadas = visiveis();
        if (this.ordem) afetadas.sort((a, b) => (a[this.ordem] < b[this.ordem] ? -1 : 1));
        if (this.limite) afetadas = afetadas.slice(0, this.limite);
      } else if (this.op === 'insert') {
        const linhas = (Array.isArray(this.dados) ? this.dados : [this.dados]).map((l) => comPadroes(this.t, l));
        for (const l of linhas) {
          const erro = validar(this.t, l);
          if (erro) return { data: null, error: { message: erro } };
          if (tab.some((r) => mesmaChave(this.t, r, l))) return { data: null, error: { message: 'duplicate key value violates unique constraint' } };
        }
        tab.push(...linhas);
        afetadas = linhas;
      } else if (this.op === 'update') {
        afetadas = visiveis();
        afetadas.forEach((r) => Object.assign(r, this.dados));
      } else if (this.op === 'upsert') {
        for (const l0 of Array.isArray(this.dados) ? this.dados : [this.dados]) {
          const l = comPadroes(this.t, l0);
          const erro = validar(this.t, l);
          if (erro) return { data: null, error: { message: erro } };
          const i = tab.findIndex((r) => mesmaChave(this.t, r, l, this.conflito));
          if (i >= 0) tab[i] = { ...tab[i], ...l };
          else tab.push(l);
          afetadas.push(l);
        }
      } else if (this.op === 'delete') {
        afetadas = visiveis();
        db[this.t] = tab.filter((r) => !afetadas.includes(r));
      }
      afetadas = copia(afetadas);
      if (this.modo === 'single') {
        return afetadas.length === 1 ? { data: afetadas[0], error: null } : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
      }
      if (this.modo === 'maybe') return { data: afetadas[0] ?? null, error: null };
      return { data: this.op === 'select' || this.retornar ? afetadas : null, error: null };
    }
  }

  const auth = {
    async getSession() { return { data: { session: sessao } }; },
    onAuthStateChange(f) { ouvintes.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
    async signUp({ email, password, options = {} }) {
      if (password.length < 6) return { data: {}, error: { message: 'Password should be at least 6 characters.' } };
      const existe = usuarios.find((u) => u.email === email);
      if (existe) {
        if (confirmarEmail) return { data: { user: { id: crypto.randomUUID(), identities: [] }, session: null }, error: null };
        return { data: {}, error: { message: 'User already registered' } };
      }
      const u = { id: crypto.randomUUID(), email, senha: password, confirmado: !confirmarEmail, user_metadata: options.data ?? {} };
      usuarios.push(u);
      if (!confirmarEmail) {
        abrirSessao(u);
        emitir('SIGNED_IN'); // o Supabase real avisa antes de devolver a resposta
      }
      return { data: { user: { id: u.id, identities: [{}] }, session: sessao }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const u = usuarios.find((x) => x.email === email && x.senha === password);
      if (!u) return { data: {}, error: { message: 'Invalid login credentials' } };
      if (!u.confirmado) return { data: {}, error: { message: 'Email not confirmed' } };
      abrirSessao(u);
      emitir('SIGNED_IN');
      return { data: { session: sessao }, error: null };
    },
    async signOut() { sessao = null; emitir('SIGNED_OUT'); return { error: null }; },
    async resetPasswordForEmail() { return { error: null }; },
    async updateUser({ password }) {
      usuarios.find((u) => u.id === sessao.user.id).senha = password;
      return { error: null };
    },
  };

  const cliente = { auth, from: (t) => new Consulta(t) };
  return {
    createClient: () => cliente,
    db: () => db,
    confirmar: (email) => { usuarios.find((u) => u.email === email).confirmado = true; },
  };
}
