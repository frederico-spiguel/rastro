# Protocolo da sessão do piloto

Duração: cerca de 1 hora (65 minutos). Pode ser presencial (laboratório ou celular) ou remota
(chamada de vídeo, cada um no próprio aparelho).

## Antes do piloto (semana de 23 a 29/11)

- [x] Professor revisou as 8 questões, o termo e este protocolo.
- [ ] (recomendado) 2 ou 3 colegas fizeram as formas A e B para conferir clareza e se as duas têm a mesma dificuldade.
- [x] Formulários criados no Google Forms (teste forma A, teste forma B e MEEGA+), com o
      campo "código de participante" no começo de cada um. Os links estão em `src/config.js`
      e aparecem na tela Pesquisa do jogo (a forma certa para cada código).
- [x] Site publicado e testado (cadastro, tutorial e gravação no Supabase).
- [ ] Códigos distribuídos (ver `codigos.md`). Cada código já define a ordem das formas.
- [ ] (recomendado) Ensaio completo da sessão com um colega, cronometrado.

## Roteiro da sessão

| Tempo | Etapa | O que fazer |
|---|---|---|
| 0–5 min | Abertura | Explicar o objetivo, que a participação é voluntária, que não vale nota e que o participante pode parar a qualquer momento. Entregar o código. |
| 5–10 min | Cadastro | Abrir o site, criar conta com o código (aceitando o termo) e responder às 3 perguntas. |
| 10–20 min | Pré-teste | Em "Pesquisa", abrir o teste indicado (a forma sai do código). Sem executar código e sem consulta; pode rabiscar no papel. Até 10 min. Depois, fazer o tutorial. |
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
> faz um teste curto num formulário; depois joga por meia hora e, no fim, faz outro teste parecido e
> responde a um questionário. Não vale nota e não estamos avaliando você, e sim o jogo.
> Você pode parar quando quiser. Seu nome não aparece em nenhum dado: use só o código que
> vamos te dar.

## Depois de cada sessão

- Ao fim do piloto, baixar as respostas das formas A e B em CSV e rodar `python tools/corrigir_forms.py` (gera `notas.csv`).
- Exportar os eventos (Supabase: visão `analise_eventos` > Export CSV, ou os arquivos do modo local).
- Baixar as respostas do MEEGA+ em CSV e rodar `python tools/meega.py converter` (ver `meega.md`).
- Rodar `python tools/analisar_piloto.py` (veja o cabeçalho do script).
