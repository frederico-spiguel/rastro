// Fachada única para conta, progresso e registros. Escolhe o Supabase (se configurado)
// ou o modo local. As telas só falam com `servico`, nunca direto com o back-end.
import { CONFIG } from '../config.js';

// Versão fixa da biblioteca oficial do Supabase.
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

let impl = null;

export async function iniciarServico() {
  if (CONFIG.supabaseUrl && CONFIG.supabaseChaveAnon) {
    try {
      const [m, lib] = await Promise.all([import('./servico-supabase.js'), import(SUPABASE_JS)]);
      impl = await m.criarServicoSupabase(CONFIG, lib.createClient);
    } catch (e) {
      console.error(e);
      throw new Error('Não foi possível conectar ao servidor do jogo. Verifique a internet e recarregue a página.');
    }
  } else {
    const m = await import('./servico-local.js');
    impl = m.criarServicoLocal();
  }
  return impl;
}

export const servico = new Proxy({}, {
  get(_, chave) {
    if (!impl) throw new Error('serviço ainda não iniciado');
    return impl[chave];
  },
});

// ---- utilidades compartilhadas pelos dois back-ends ----
export function lerLocal(chave, padrao) {
  try {
    const t = localStorage.getItem(chave);
    return t ? JSON.parse(t) : padrao;
  } catch {
    return padrao;
  }
}

export function gravarLocal(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* modo privado ou armazenamento cheio */
  }
}

export function novoResultado(antes, estrelas) {
  const a = antes ?? { estrelas: 0, vezes: 0 };
  return { concluido: true, estrelas: Math.max(a.estrelas, estrelas), vezes: a.vezes + 1 };
}
