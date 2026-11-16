// Configuração do Rastro.
// Sem URL/chave do Supabase, o jogo roda em MODO LOCAL (perfis e dados só neste navegador).
export const CONFIG = {
  // Supabase > Project Settings > API. A chave "anon public" pode ficar no site: quem
  // protege os dados são as regras (RLS) do arquivo sql/schema.sql.
  supabaseUrl: '',
  supabaseChaveAnon: '',

  // Trilha seguinte libera quando esta fração dos desafios da anterior estiver concluída.
  percentualParaDesbloquear: 0.6,
  // true = todas as trilhas abertas desde o início (se o professor preferir no piloto).
  liberarTodasAsTrilhas: false,

  // Formulários aplicados fora do jogo (Google Forms etc.). Vazio = não aparece.
  links: {
    preTeste: '',
    posTeste: '',
    meega: '',
  },

  contato: 'e-mail de contato da dupla (preencher)',
};
