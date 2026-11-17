# Rastro

Jogo sério de navegador para treinar **teste de mesa** (rastrear, linha a linha, como as
variáveis mudam) em Python simplificado. Trabalho de Izadora Queiros e Frederico Spiguel.

- Jogo: https://frederico-spiguel.github.io/rastro/ (GitHub Pages + Supabase para login e dados)
- Piloto: 30/11 a 06/12/2026. Entrega e apresentação: 11/12/2026.
- Pesquisa: pré-teste, 30 min de jogo, pós-teste (formas A/B contrabalanceadas, no Google
  Forms) e MEEGA+. Roteiro em `pesquisa/protocolo.md`.

## Ferramentas da pesquisa

```
python tools/corrigir_forms.py --a forma-A.csv --b forma-B.csv   # notas do pré/pós-teste
python tools/meega.py converter respostas-meega.csv              # MEEGA+ para a análise
python tools/analisar_piloto.py --notas pesquisa/notas.csv --meega pesquisa/dados/meega.csv
```

## Estrutura

```
src/config.js     configuração (Supabase, desbloqueio, links da pesquisa)
src/app/          telas, conta, progresso e registros
src/motor/        motor do jogo (JavaScript puro, sem dependências)
  lexico.js         texto -> tokens
  sintatico.js      tokens -> árvore
  interpretador.js  executa e devolve o histórico de estados (o gabarito)
  gerador.js        sorteia valores e monta cada variação do desafio
data/desafios/    banco de desafios, um JSON por trilha (lista em indice.json)
sql/schema.sql    tabelas e regras de acesso do Supabase
tests/            testes automáticos (inclui comparação com o Python real)
```

## Rodar o jogo no computador

```
python tools/servidor.py
```

Abra http://localhost:8765. Sem Supabase configurado, o jogo roda em **modo local**
(perfis e dados só naquele navegador).

## Ligar o Supabase (login e dados online)

1. Crie uma conta em supabase.com e um projeto novo (plano gratuito).
2. Em **SQL Editor**, cole o conteúdo de `sql/schema.sql` e clique em **Run**.
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public** para
   `src/config.js` (`supabaseUrl` e `supabaseChaveAnon`).
4. Em **Authentication > URL Configuration**, coloque o endereço do site publicado em
   **Site URL** e também em **Redirect URLs** (e `http://localhost:8765` para testar).
5. Opcional: em **Authentication > Providers > Email**, desligar **Confirm email** deixa
   o cadastro mais rápido no piloto (sem precisar abrir o e-mail).

Os dados do piloto ficam nas tabelas `perfis`, `progresso` e `eventos`. A visão
`analise_eventos` junta tudo pelo código de participante, sem e-mails. Para baixar:
Table Editor > tabela > Export to CSV.

## Rodar os testes

Precisa de Node 18+ e Python 3.

```
npm test
```

Os testes geram 40 variações de cada desafio e conferem, passo a passo, se o motor dá
exatamente o mesmo resultado que o Python de verdade.

## Python aceito nos desafios

- Variáveis com int, float, bool, texto e listas; atribuição e `+=`, `-=` etc.
- Operadores `+ - * / // % **`, comparações (inclusive encadeadas), `and or not`, `in`
- `if / elif / else`, `while`, `for ... in` (range, lista ou texto), `break`, `continue`, `pass`
- Funções: `print` (com `sep` e `end`), `input`, `int`, `float`, `str`, `len`, `range`,
  `abs`, `min`, `max`, `sum`; método `lista.append(x)`
- Fora: funções, classes, dicionários, tuplas, fatias, compreensões, imports

## Como escrever um desafio

Cada arquivo `data/desafios/trilhaN.json` tem uma lista `desafios`. Exemplo:

```json
{
  "id": "t1-02",
  "titulo": "Troca de valores",
  "conceito": "atribuição",
  "dificuldade": 1,
  "codigo": ["x = {X}", "y = {Y}", "aux = x", "x = y", "y = aux", "print(x, y)"],
  "parametros": {
    "X": { "tipo": "int", "min": 1, "max": 20 },
    "Y": { "tipo": "int", "min": 1, "max": 20 }
  },
  "condicao": "X != Y",
  "entradas": [],
  "dicas": ["dica geral", "dica intermediária", "dica bem específica"],
  "explicacao": "mostrada ao final do desafio"
}
```

- `codigo`: de 3 a 12 linhas. `{NOME}` é trocado pelo valor sorteado.
- `parametros`: `int` (min, max), `escolha` (opcoes: lista de valores) ou
  `lista` (tamanho: [min, max], min, max, distintos opcional).
- `condicao` (opcional): expressão em Python sobre os parâmetros; o gerador sorteia de novo
  até ela ser verdadeira.
- `entradas` (opcional): o que `input()` vai receber, na ordem (aceita `{NOME}`).
- `dicas`: da mais geral para a mais específica.

Depois de editar, rode `npm test`: ele avisa se alguma variação dá erro, fica longa demais
(mais de 40 passos) ou difere do Python real.
