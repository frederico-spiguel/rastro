// Configuração do Rastro.
// Sem URL/chave do Supabase, o jogo roda em MODO LOCAL (perfis e dados só neste navegador).
export const CONFIG = {
  // Supabase > Project Settings > API. A chave "anon public" pode ficar no site: quem
  // protege os dados são as regras (RLS) do arquivo sql/schema.sql.
  supabaseUrl: 'https://zytqysvducqnscffivla.supabase.co',
  supabaseChaveAnon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5dHF5c3ZkdWNxbnNjZmZpdmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3OTAyNzMsImV4cCI6MjExMDM2NjI3M30.Pexi5DCUQzJbIV3RTZVeMj3RGjlbEOs4ezTGxYSvcK4',

  // Trilha seguinte libera quando esta fração dos desafios da anterior estiver concluída.
  percentualParaDesbloquear: 0.6,
  // true = todas as trilhas abertas desde o início (se o professor preferir no piloto).
  liberarTodasAsTrilhas: false,

  // Formulários do Google Forms. Vazio = aparece "link ainda não disponível".
  // O jogo escolhe a forma do pré e do pós-teste pelo código de participante
  // (ímpar: A antes e B depois; par: o contrário).
  links: {
    formaA: '',
    formaB: '',
    meega: '',
  },

  contato: 'frederico.spiguel@gmail.com',
};
