# Publicar o Rastro: o que só vocês podem fazer

> **Situação em 16/11/2026: tudo concluído.** Site no ar em
> https://frederico-spiguel.github.io/rastro/, Supabase ligado e testado, formulários criados
> (ver `pesquisa/forms-passo-a-passo.md`). Este guia fica como registro e para refazer, se preciso.

O código já está pronto e salvo num repositório git local (pasta do projeto, branch `main`).
Faltam só os passos que dependem das contas de vocês. Tempo estimado: 20 a 30 minutos.

## 1. GitHub (hospedagem do site)

1. Crie uma conta em github.com, se ainda não tiver.
2. Clique em **New repository**: nome `rastro`, **Public**, sem README (o projeto já tem um).
3. Abra um terminal na pasta do projeto e rode (troque `SEU-USUARIO`):

   ```bash
   git remote add origin https://github.com/SEU-USUARIO/rastro.git
   git push -u origin main
   ```

   Na primeira vez, o Windows abre uma janela para entrar no GitHub.
4. No repositório: **Settings > Pages > Build and deployment > Source: Deploy from a branch**,
   branch `main`, pasta `/ (root)` > **Save**.
5. Em cerca de 1 minuto, o site fica em `https://SEU-USUARIO.github.io/rastro/`.
6. **Settings > Collaborators**: adicione a Izadora.

Até aqui o jogo já funciona online em **modo local** (cada aparelho guarda os próprios dados).

## 2. Supabase (login e dados online)

1. Crie uma conta em supabase.com (pode entrar com o GitHub) e um projeto novo, no plano
   gratuito, na região **South America (São Paulo)**. Guarde a senha do banco.
2. **SQL Editor > New query**: cole todo o conteúdo de `sql/schema.sql` e clique em **Run**.
   O resultado esperado é "Success. No rows returned".
3. **Authentication > URL Configuration**:
   - Site URL: `https://SEU-USUARIO.github.io/rastro/`
   - Redirect URLs: a mesma URL e também `http://localhost:8765`
4. **Authentication > Providers > Email**: recomendo desligar **Confirm email** durante o
   piloto. Assim o participante entra direto, sem abrir o e-mail (o serviço de e-mail gratuito
   do Supabase envia poucas mensagens por hora).
5. **Project Settings > API**: copie a **Project URL** e a chave **anon public** (nunca a `service_role`).

## 3. Ligar os dois

Edite `src/config.js`:

```js
supabaseUrl: 'https://xxxx.supabase.co',
supabaseChaveAnon: 'eyJ...',
contato: 'e-mail da dupla',
links: { formaA: '...', formaB: '...', meega: '...' },   // ver pesquisa/forms-passo-a-passo.md
```

Depois publique:

```bash
git add src/config.js
git commit -m "Liga o Supabase"
git push
```

Ou me mande a URL e a chave: eu edito, testo e deixo pronto para o push.

## 4. Conferir (5 minutos)

- [ ] Abrir o site no celular e no computador.
- [ ] Criar uma conta de teste, fazer o tutorial e 1 desafio.
- [ ] No Supabase, **Table Editor**: aparecem linhas em `perfis`, `progresso` e `eventos`.
- [ ] Sair, entrar de novo e conferir se o progresso voltou.
- [ ] Em "Pesquisa > Apagar meus dados", apagar a conta de teste.

## Observações

- A chave `anon` pode ficar no site: quem protege os dados são as regras do `schema.sql`
  (cada jogador só vê os próprios dados).
- O repositório é público. Por isso, as questões e o gabarito do pré/pós-teste
  (`pesquisa/testes.json`, `forma-*.md`, `gabarito.md`) ficam fora do git até o piloto acabar
  (ver `.gitignore`). Mande esses arquivos para a Izadora por outro meio.
- Projetos gratuitos do Supabase "dormem" depois de 7 dias sem uso. Se isso acontecer, entre
  no painel e clique em **Restore** antes de cada sessão.
