# Questionário MEEGA+ — como aplicar no piloto

O MEEGA+ (Petri, Gresse von Wangenheim et al., GQS/UFSC) é o modelo padronizado para
avaliar jogos educacionais de computação. **Use o questionário oficial**, baixado do site do
grupo GQS/UFSC, para manter a validade do instrumento. Este arquivo só resume o que adaptar.

## Estrutura (para conferir no formulário)

- **Perfil:** idade, gênero, frequência com que joga (o questionário oficial já traz).
- **Usabilidade:** estética, aprendibilidade, operabilidade, acessibilidade.
- **Experiência do jogador:** confiança, desafio, satisfação, interação social, diversão,
  atenção focada, relevância e aprendizagem percebida.
- **Escala:** Likert de 5 pontos, de "discordo totalmente" (−2) a "concordo totalmente" (+2).
  O ponto neutro é 0.
- **Perguntas abertas:** pontos fortes, sugestões e comentários.

## Adaptações

1. Trocar o nome genérico do jogo por **Rastro**.
2. **Interação social:** o Rastro é individual e não tem ranking. Remova esses itens e
   explique a remoção no relatório (o próprio modelo prevê omitir itens que não se aplicam).
3. Na aprendizagem percebida, os objetivos do jogo são: prever o valor das variáveis após
   cada linha; avaliar condições de if/while; acompanhar laços; ler o que o programa imprime.
4. Colocar o **código de participante** como 1ª pergunta do formulário.

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
