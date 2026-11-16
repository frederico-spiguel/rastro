// Testa o serviço do Supabase contra um banco simulado (sem internet e sem conta).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { criarSupabaseFalso } from './supabase-falso.js';

before(() => {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
  };
  globalThis.location = { origin: 'http://localhost:8765', pathname: '/', search: '', hash: '' };
  globalThis.history = { replaceState() {} };
  globalThis.document = { visibilityState: 'visible', addEventListener() {} };
});

const CFG = { supabaseUrl: 'http://falso', supabaseChaveAnon: 'x' };
const espera = () => new Promise((r) => setTimeout(r, 10));

async function novoServico(opcoes) {
  localStorage.clear();
  const falso = criarSupabaseFalso(opcoes);
  const { criarServicoSupabase } = await import('../src/app/servico-supabase.js');
  const s = await criarServicoSupabase(CFG, falso.createClient);
  return { s, falso };
}

test('cadastro sem confirmação de e-mail já entra e cria o perfil uma única vez', async () => {
  const { s, falso } = await novoServico();
  const r = await s.cadastrar({ email: 'a@x.com', senha: '123456', apelido: 'Ana', codigo: 'P01' });
  await espera();
  assert.equal(r.precisaConfirmarEmail, false);
  assert.equal(s.perfil().apelido, 'Ana');
  assert.equal(s.perfil().codigo_participante, 'P01');
  assert.equal(falso.db().perfis.length, 1);
  assert.ok(!('email' in falso.db().perfis[0]), 'e-mail não deve ir para a tabela de perfis');
});

test('cadastro com confirmação: pede para confirmar e cria o perfil no 1º login', async () => {
  const { s, falso } = await novoServico({ confirmarEmail: true });
  const r = await s.cadastrar({ email: 'b@x.com', senha: '123456', apelido: 'Bia', codigo: '' });
  assert.equal(r.precisaConfirmarEmail, true);
  assert.equal(s.perfil(), null);
  await assert.rejects(s.entrar({ email: 'b@x.com', senha: '123456' }), /Confirme seu e-mail/);
  falso.confirmar('b@x.com');
  await s.entrar({ email: 'b@x.com', senha: '123456' });
  await espera();
  assert.equal(s.perfil().apelido, 'Bia');
  assert.equal(falso.db().perfis.length, 1);
  await assert.rejects(
    s.cadastrar({ email: 'b@x.com', senha: '123456', apelido: 'Bia2' }),
    /Já existe uma conta/,
  );
});

test('erros traduzidos para o jogador', async () => {
  const { s } = await novoServico();
  await assert.rejects(s.entrar({ email: 'ninguem@x.com', senha: 'errada' }), /E-mail ou senha incorretos/);
  await assert.rejects(s.cadastrar({ email: 'c@x.com', senha: '123', apelido: 'Cy' }), /pelo menos 6/);
});

test('progresso guarda a melhor nota e volta depois de sair e entrar', async () => {
  const { s } = await novoServico();
  await s.cadastrar({ email: 'd@x.com', senha: '123456', apelido: 'Duda' });
  await s.salvarResultado('t1-01', { estrelas: 3 });
  await s.salvarResultado('t1-01', { estrelas: 1 });
  assert.deepEqual(s.progresso()['t1-01'], { concluido: true, estrelas: 3, vezes: 2 });
  await s.sair();
  assert.equal(s.perfil(), null);
  await s.entrar({ email: 'd@x.com', senha: '123456' });
  assert.deepEqual(s.progresso()['t1-01'], { concluido: true, estrelas: 3, vezes: 2 });
});

test('registros vão para o banco sem campos extras e podem ser exportados', async () => {
  const { s, falso } = await novoServico();
  await s.cadastrar({ email: 'e@x.com', senha: '123456', apelido: 'Edu', codigo: 'P05' });
  s.registrar('passo_erro', { desafio: 't1-02', linha: 4, comando: 'atribuicao' });
  s.registrar('dica', { desafio: 't1-02', nivel: 1 });
  const eventos = await s.meusEventos();
  assert.equal(eventos.length, 2);
  assert.equal(falso.db().eventos.length, 2);
  assert.equal(falso.db().eventos[0].desafio, 't1-02');
  assert.equal(falso.db().eventos[0].dados.linha, 4);
  assert.equal(JSON.parse(localStorage.getItem('rastro.fila')).length, 0, 'fila esvaziada');
});

test('um jogador não vê os dados de outro', async () => {
  const { s, falso } = await novoServico();
  await s.cadastrar({ email: 'f@x.com', senha: '123456', apelido: 'Fê' });
  s.registrar('dica', { desafio: 't1-01' });
  await s.meusEventos();
  await s.sair();
  await s.cadastrar({ email: 'g@x.com', senha: '123456', apelido: 'Gui' });
  assert.equal((await s.meusEventos()).length, 0);
  assert.deepEqual(s.progresso(), {});
  assert.equal(falso.db().eventos.length, 1);
});

test('apagar meus dados remove perfil, progresso e registros', async () => {
  const { s, falso } = await novoServico();
  await s.cadastrar({ email: 'h@x.com', senha: '123456', apelido: 'Hel' });
  await s.salvarResultado('t1-01', { estrelas: 2 });
  s.registrar('dica', { desafio: 't1-01' });
  await s.meusEventos();
  await s.apagarMeusDados();
  assert.equal(s.perfil(), null);
  const db = falso.db();
  assert.equal(db.perfis.length + db.progresso.length + db.eventos.length, 0);
});
