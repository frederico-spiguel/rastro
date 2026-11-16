# Protocolo da sessão do piloto (rascunho)

Duração: cerca de 55 minutos. Pode ser presencial (laboratório ou celular) ou remota
(chamada de vídeo, cada um no próprio aparelho).

## Antes do piloto (semana de 23 a 29/11)

- [ ] Professor revisou as 8 questões, o termo e este protocolo.
- [ ] 2 ou 3 colegas fizeram as formas A e B para conferir clareza e se as duas têm a mesma dificuldade.
- [ ] Formulários criados (pré-teste A, pré-teste B, pós-teste A, pós-teste B e MEEGA+), com o
      campo "código de participante" no começo de cada um. Os links estão em `src/config.js`.
- [ ] Site publicado e testado no celular e no computador.
- [ ] Códigos distribuídos (ver `codigos.md`). Cada código já define a ordem das formas.
- [ ] Ensaio completo da sessão com um colega, cronometrado.

## Roteiro da sessão

| Tempo | Etapa | O que fazer |
|---|---|---|
| 0–5 min | Abertura | Explicar o objetivo, que a participação é voluntária, que não vale nota e que o participante pode parar a qualquer momento. Entregar o código. |
| 5–15 min | Pré-teste | Forma indicada pelo código. Sem computador e sem consulta. Até 10 min. |
| 15–20 min | Cadastro | Abrir o site, criar conta (aceitando o termo), responder às 3 perguntas e fazer o tutorial. |
| 20–50 min | Jogo | Jogar livremente por 30 minutos, a partir da trilha 1. Os condutores só ajudam com problemas técnicos, não com os desafios. |
| 50–60 min | Pós-teste | A outra forma, nas mesmas condições do pré-teste. |
| 60–65 min | MEEGA+ | Questionário de percepção do jogo. |
| 65 min | Encerramento | Agradecer. No modo local, pedir o arquivo exportado em "Pesquisa". |

## Regras para os condutores

- Usar a mesma fala de abertura com todos (ler o parágrafo abaixo).
- Não explicar conceitos de programação durante a sessão: isso contamina o pós-teste.
- Anotar problemas técnicos e observações (por exemplo, "travou na linha do for") com o código do participante.
- Se alguém desistir, registrar em que etapa. Os dados dessa pessoa entram só até onde ela chegou.

## Fala de abertura

> Obrigado por participar. Estamos testando o Rastro, um jogo para treinar teste de mesa,
> ou seja, acompanhar o que acontece com as variáveis enquanto um programa roda. Primeiro você
> faz um teste curto no papel; depois joga por meia hora e, no fim, faz outro teste parecido e
> responde a um questionário. Não vale nota e não estamos avaliando você, e sim o jogo.
> Você pode parar quando quiser. Seu nome não aparece em nenhum dado: use só o código que
> vamos te dar.

## Depois de cada sessão

- Corrigir os testes com o `gabarito.md` e lançar as notas em `notas.csv` (modelo: `notas-modelo.csv`).
- Exportar os eventos (Supabase: visão `analise_eventos` > Export CSV, ou os arquivos do modo local).
- Exportar as respostas do MEEGA+ em CSV.
- Rodar `python tools/analisar_piloto.py` (veja o cabeçalho do script).
