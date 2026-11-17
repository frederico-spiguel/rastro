# Questionário MEEGA+ — como aplicar no piloto

O MEEGA+ (Petri, Gresse von Wangenheim et al., GQS/UFSC) é o modelo padronizado para
avaliar jogos educacionais de computação. O formulário do piloto foi montado a partir do
**questionário oficial do aluno em português (v2018)**, com as adaptações abaixo.
Link: https://forms.gle/j9B7AbXQozHaYZAF9 (também na tela Pesquisa do jogo).

## Estrutura

- **Perfil:** idade, gênero, frequência com que joga (o questionário oficial já traz).
- **Usabilidade:** estética, aprendibilidade, operabilidade, acessibilidade.
- **Experiência do jogador:** confiança, desafio, satisfação, interação social, diversão,
  atenção focada, relevância e aprendizagem percebida.
- **Escala:** Likert de 5 pontos, de "discordo totalmente" (−2) a "concordo totalmente" (+2).
  O ponto neutro é 0.
- **Perguntas abertas:** pontos fortes, sugestões e comentários.

## Adaptações feitas

1. Nome do jogo: **Rastro**. Na descrição, "disciplina" = disciplina de programação.
2. **Interação social:** os 3 itens foram retirados, porque o Rastro é individual e não tem
   ranking. Explicar a remoção no relatório (o modelo prevê omitir itens que não se aplicam).
3. Aprendizagem percebida: a afirmação "O jogo contribuiu para..." foi repetida para os
   5 objetivos do Rastro: aplicar o teste de mesa (valor das variáveis após cada linha);
   avaliar condições de if/elif/while; acompanhar laços; prever o que o programa imprime;
   localizar erros simulando a execução.
4. **Código de participante** como 1ª pergunta; opção "Prefiro não informar" em Sexo.
5. Resultado: 9 itens de usabilidade e 24 de experiência do jogador, todos obrigatórios,
   mais demografia (opcional) e 3 perguntas abertas.

## Análise prevista

Mediana por fator e porcentagem de respostas positivas (+1 ou +2). Critério proposto:
experiência boa quando as medianas ficam acima de 0. O `tools/analisar_piloto.py` faz
essa conta se o CSV tiver uma coluna por item, nomeada `fator:item` (ex.: `diversao:1`).

## Situação (16/11/2026)

Formulário criado a partir do questionário oficial do aluno em português (v2018), baixado em
https://www.ufsm.br/grupos/gptec/paginas/portfolio/meega (GpTEc/UFSM, parceiro do GQS/UFSC).
Itens, fatores e adaptações estão em `tools/meega.py`. Link já em `src/config.js`.

Depois do piloto: Respostas > Planilhas > Arquivo > Fazer download > CSV, salvar em
`pesquisa/dados/meega-forms.csv` e rodar:

    python tools/meega.py converter pesquisa/dados/meega-forms.csv
    python tools/analisar_piloto.py --notas pesquisa/notas.csv --meega pesquisa/dados/meega.csv
