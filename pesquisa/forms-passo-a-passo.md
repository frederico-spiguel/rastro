# Montar o pré/pós-teste e o MEEGA+ no Google Forms

São 3 formulários: **Teste (forma A)**, **Teste (forma B)** e **MEEGA+**.
O jogo mostra a cada participante o link certo: código ímpar faz a forma A antes e a B depois;
código par faz o contrário. A correção é feita pelo script `tools/corrigir_forms.py`, então
**não é preciso** configurar gabarito nem transformar em teste (quiz) no Forms.

As imagens do código já estão prontas em `pesquisa/forms/forma-A/` e `pesquisa/forms/forma-B/`
(geradas por `python tools/gerar_imagens_forms.py`; ficam fora do git).

## 1. Formulário "Rastro: teste (forma A)"

1. Acesse forms.google.com > **Formulário em branco**.
2. Título: `Rastro: teste (forma A)`. Descrição (copie):

   > Para cada programa em Python, escreva o valor FINAL das variáveis pedidas, depois de o
   > programa inteiro ser executado. Não use computador nem execute o código; pode usar papel
   > para rabiscar. Atenção ao tipo: escreva 4.0 se o valor for float (decimal) e 4 se for
   > inteiro. Listas como [1, 2, 3]. Se não souber, deixe em branco. Tempo sugerido: 15 minutos.

3. Engrenagem (**Configurações**) > **Respostas**: deixe **desligado** "Coletar endereços de
   e-mail" e "Limitar a 1 resposta" (assim ninguém precisa de conta Google e nada pessoal é
   coletado).
4. Primeira pergunta: **Resposta curta**, título exatamente `Código de participante`,
   **Obrigatória** ligada. Descrição: `O mesmo código usado no jogo (ex.: RST07).`
5. Para cada questão de 1 a 8:
   1. Na barra lateral, clique em **Adicionar imagem** e envie `forma-A/questao-N.png`.
      Título da imagem: `Questão N`.
   2. Logo abaixo, adicione uma pergunta de **Resposta curta** para **cada variável** da
      tabela abaixo, com o título **exatamente** no formato `Questão N: valor final de X`
      (o script de correção depende disso). Deixe como **não obrigatória**.

   | Questão | Perguntas (títulos) |
   |---|---|
   | 1 | `Questão 1: valor final de a` · `Questão 1: valor final de b` |
   | 2 | `Questão 2: valor final de q` · `... de r` · `... de m` |
   | 3 | `Questão 3: valor final de c` · `... de n` |
   | 4 | `Questão 4: valor final de y` |
   | 5 | `Questão 5: valor final de s` · `... de i` |
   | 6 | `Questão 6: valor final de c` · `... de k` |
   | 7 | `Questão 7: valor final de t` · `... de i` |
   | 8 | `Questão 8: valor final de v` · `... de n` |

   Dica: monte a questão 1 inteira e use **Duplicar** (ícone de cópia) nas perguntas, só
   trocando o número e a letra.
6. Opcional (recomendado): **Adicionar seção** antes de cada imagem, para mostrar uma questão
   por página.
7. Clique em **Visualizar** (ícone do olho) e confira as 8 imagens.

## 2. Formulário "Rastro: teste (forma B)"

No formulário A: menu **⋮ > Fazer uma cópia**, nome `Rastro: teste (forma B)`. Na cópia,
troque o título e **substitua as 8 imagens** pelas de `forma-B/` (clique na imagem > ⋮ >
Substituir imagem ou apague e adicione de novo). As perguntas e títulos ficam iguais.

## 3. Formulário MEEGA+

1. Baixe o questionário oficial no site do GQS/UFSC (busque "MEEGA+ questionário").
2. Monte no Forms: primeira pergunta `Código de participante` (obrigatória), depois os itens
   em **Escala linear** de 1 a 5 (1 = discordo totalmente, 5 = concordo totalmente) e as
   perguntas abertas no final.
3. Adaptações (detalhes em `pesquisa/meega.md`): trocar o nome do jogo por **Rastro**; remover
   os itens de **interação social** (o jogo é individual).

## 4. Pegar os links e me passar

Em cada formulário: **Enviar** > ícone de link (🔗) > marque **Encurtar URL** > **Copiar**.
Mande os 3 links para o Claude (ou cole em `src/config.js` nos campos `formaA`, `formaB` e
`meega`) e depois publique com `git push`.

## 5. Teste antes do piloto

Abra a forma A pelo celular, responda com o código `TESTE`, e confira em **Respostas** que
chegou. Depois apague a resposta (Respostas > ⋮ > Excluir todas as respostas).

## 6. Depois do piloto: corrigir

1. Em cada formulário de teste: **Respostas > Vincular ao Planilhas** (ícone verde) >
   **Arquivo > Fazer download > Valores separados por vírgula (.csv)**.
2. Salve como `pesquisa/dados/forma-A.csv` e `pesquisa/dados/forma-B.csv` e rode:

   ```bash
   python tools/corrigir_forms.py --a pesquisa/dados/forma-A.csv --b pesquisa/dados/forma-B.csv
   ```

   Isso gera `pesquisa/notas.csv` (nota de 0 a 8 no pré e no pós, por participante, e
   acerto por questão). Em seguida:

   ```bash
   python tools/analisar_piloto.py --notas pesquisa/notas.csv
   ```

## Situação em 16/11/2026

As formas A e B já foram criadas por Apps Script (projeto "Projeto sem título" no
script.google.com da conta UNIRIO), com o código das questões em texto (recuo preservado),
e liberadas para "qualquer pessoa com o link". Os links já estão em `src/config.js`.
Falta só o MEEGA+ (seção 3).
