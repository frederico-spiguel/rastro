"""MEEGA+ do Rastro: itens, geração do Apps Script do formulário e conversão das respostas.

Fonte: questionário oficial do aluno, versão em português v2018 (GQS/UFSC e GpTEc/UFSM),
https://www.ufsm.br/grupos/gptec/paginas/portfolio/meega
Adaptações (ver pesquisa/meega.md): jogo "Rastro"; removidos os 3 itens de interação social
(o jogo é individual); objetivos de aprendizagem do Rastro no lugar do exemplo do modelo;
opção "Prefiro não informar" em Sexo.

Uso:
    python tools/meega.py script                  # imprime o Apps Script que cria o formulário
    python tools/meega.py converter respostas.csv  # gera pesquisa/dados/meega.csv (fator:item, -2..2)
"""
import csv
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

ESCALA = ["Discordo totalmente", "Discordo", "Nem discordo, nem concordo", "Concordo", "Concordo totalmente"]

USABILIDADE = [
    ("estetica", "O design do jogo é atraente (tabuleiro, cartas, interfaces, gráficos, etc.)."),
    ("estetica", "Os textos, cores e fontes combinam e são consistentes."),
    ("aprendibilidade", "Eu precisei aprender poucas coisas para poder começar a jogar o jogo."),
    ("aprendibilidade", "Aprender a jogar este jogo foi fácil para mim."),
    ("aprendibilidade", "Eu acho que a maioria das pessoas aprenderiam a jogar este jogo rapidamente."),
    ("operabilidade", "Eu considero que o jogo é fácil de jogar."),
    ("operabilidade", "As regras do jogo são claras e compreensíveis."),
    ("acessibilidade", "As fontes (tamanho e estilo) utilizadas no jogo são legíveis."),
    ("acessibilidade", "As cores utilizadas no jogo são compreensíveis."),
]

EXPERIENCIA = [
    ("confianca", "A organização do conteúdo me ajudou a estar confiante de que eu iria aprender com este jogo."),
    ("desafio", "Este jogo é adequadamente desafiador para mim."),
    ("desafio", "O jogo oferece novos desafios (oferece novos obstáculos, situações ou variações) com um ritmo adequado."),
    ("desafio", "O jogo não se torna monótono nas suas tarefas (repetitivo ou com tarefas chatas)."),
    ("satisfacao", "Completar as tarefas do jogo me deu um sentimento de realização."),
    ("satisfacao", "É devido ao meu esforço pessoal que eu consigo avançar no jogo."),
    ("satisfacao", "Me sinto satisfeito com as coisas que aprendi no jogo."),
    ("satisfacao", "Eu recomendaria este jogo para meus colegas."),
    # interação social (3 itens) removida: o Rastro é individual
    ("diversao", "Eu me diverti com o jogo."),
    ("diversao", "Aconteceu alguma situação durante o jogo (elementos do jogo, competição, etc.) que me fez sorrir."),
    ("atencao_focada", "Houve algo interessante no início do jogo que capturou minha atenção."),
    ("atencao_focada", "Eu estava tão envolvido no jogo que eu perdi a noção do tempo."),
    ("atencao_focada", "Eu esqueci sobre o ambiente ao meu redor enquanto jogava este jogo."),
    ("relevancia", "O conteúdo do jogo é relevante para os meus interesses."),
    ("relevancia", "É claro para mim como o conteúdo do jogo está relacionado com a disciplina."),
    ("relevancia", "O jogo é um método de ensino adequado para esta disciplina."),
    ("relevancia", "Eu prefiro aprender com este jogo do que de outra forma (outro método de ensino)."),
    ("aprendizagem_percebida", "O jogo contribuiu para a minha aprendizagem na disciplina."),
    ("aprendizagem_percebida", "O jogo foi eficiente para minha aprendizagem, em comparação com outras atividades da disciplina."),
    # objetivos de aprendizagem do Rastro (o modelo repete a afirmação para cada objetivo)
    ("aprendizagem_percebida", "O jogo contribuiu para aplicar o teste de mesa, prevendo o valor das variáveis após cada linha de um programa."),
    ("aprendizagem_percebida", "O jogo contribuiu para avaliar condições de if, elif e while."),
    ("aprendizagem_percebida", "O jogo contribuiu para acompanhar a execução de laços (while e for)."),
    ("aprendizagem_percebida", "O jogo contribuiu para prever o que um programa imprime na tela."),
    ("aprendizagem_percebida", "O jogo contribuiu para localizar erros (bugs) simulando a execução de um programa."),
]

GRADES = [
    ("Usabilidade", USABILIDADE),
    ("Experiência do jogador (parte 1)", EXPERIENCIA[:12]),
    ("Experiência do jogador (parte 2)", EXPERIENCIA[12:]),
]

FREQ = ["Nunca: nunca jogo.", "Raramente: jogo de tempos em tempos.", "Mensalmente: jogo pelo menos uma vez por mês.",
        "Semanalmente: jogo pelo menos uma vez por semana.", "Diariamente: jogo todos os dias."]

DEMOGRAFIA = [
    ("texto", "Instituição", []),
    ("texto", "Curso", []),
    ("texto", "Disciplina", []),
    ("escolha", "Faixa etária", ["Menos de 18 anos", "18 a 28 anos", "29 a 39 anos", "40 a 50 anos", "Mais de 50 anos"]),
    ("escolha", "Sexo", ["Masculino", "Feminino", "Prefiro não informar"]),
    ("escolha", "Com que frequência você costuma jogar jogos digitais?", FREQ),
    ("escolha", "Com que frequência você costuma jogar jogos não-digitais (de cartas, tabuleiro, etc.)?", FREQ),
]

DESCRICAO = (
    "Gostaríamos que você respondesse as questões abaixo sobre a sua percepção da qualidade do jogo "
    "Rastro para nos ajudar a melhorá-lo. Todos os dados são coletados anonimamente e somente serão "
    "utilizados no contexto desta pesquisa. Onde aparece \"disciplina\", pense na disciplina de "
    "programação que você cursa ou cursou. (Questionário MEEGA+, GQS/UFSC.)"
)

ABERTAS = ["O que você mais gostou no jogo?", "O que poderia ser melhorado no jogo?", "Gostaria de fazer mais algum comentário?"]


def script():
    dados = {
        "descricao": DESCRICAO,
        "demografia": DEMOGRAFIA,
        "escala": ESCALA,
        "grades": [[t, [txt for _, txt in itens]] for t, itens in GRADES],
        "abertas": ABERTAS,
    }
    return "const MEEGA = " + json.dumps(dados, ensure_ascii=False) + """;

function criarMeega() {
  const form = FormApp.create('Rastro: questionário MEEGA+');
  form.setDescription(MEEGA.descricao);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Respostas enviadas. Muito obrigado pela sua contribuição!');
  form.addTextItem().setTitle('Código de participante').setHelpText('O mesmo código usado no jogo (ex.: RST07).').setRequired(true);
  form.addPageBreakItem().setTitle('Informações demográficas');
  MEEGA.demografia.forEach(function (d) {
    if (d[0] === 'texto') form.addTextItem().setTitle(d[1]);
    else form.addMultipleChoiceItem().setTitle(d[1]).setChoiceValues(d[2]);
  });
  MEEGA.grades.forEach(function (g) {
    form.addPageBreakItem().setTitle(g[0]).setHelpText('Marque uma opção de acordo com o quanto você concorda ou discorda de cada afirmação.');
    form.addGridItem().setTitle(g[0]).setRows(g[1]).setColumns(MEEGA.escala).setRequired(true);
  });
  form.addPageBreakItem().setTitle('Comentários');
  MEEGA.abertas.forEach(function (t) { form.addParagraphTextItem().setTitle(t); });
  Logger.log('MEEGA RESPONDER: ' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('MEEGA EDITAR: ' + form.getEditUrl());
}
"""


def converter(entrada, saida):
    """CSV do Google Forms -> uma coluna `fator:n` por item, valores -2..2 (para analisar_piloto.py)."""
    valor = {t: i - 2 for i, t in enumerate(ESCALA)}
    fator_de = {txt: fator for _, itens in GRADES for fator, txt in itens}
    with open(entrada, encoding="utf-8-sig", newline="") as f:
        linhas = list(csv.DictReader(f))
    colunas, nomes, cont = {}, [], {}
    for col in (linhas[0].keys() if linhas else []):
        if col.endswith("]") and "[" in col:
            texto = col[col.index("[") + 1:-1].strip()
            if texto in fator_de:
                fator = fator_de[texto]
                cont[fator] = cont.get(fator, 0) + 1
                nome = f"{fator}:{cont[fator]}"
                colunas[col] = nome
                nomes.append(nome)
    faltam = [t for t in fator_de if t not in {c[c.index('[') + 1:-1].strip() for c in colunas}]
    if faltam:
        raise SystemExit("Itens não encontrados no CSV: " + "; ".join(faltam))
    col_cod = next(c for c in linhas[0] if "código" in c.lower())
    Path(saida).parent.mkdir(parents=True, exist_ok=True)
    with open(saida, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["codigo"] + nomes)
        for x in linhas:
            w.writerow([x[col_cod].strip().upper()] + [valor.get(x[c], "") for c in colunas])
    print(f"{len(linhas)} resposta(s) -> {saida}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) >= 2 and sys.argv[1] == "script":
        print(script())
    elif len(sys.argv) >= 3 and sys.argv[1] == "converter":
        converter(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else str(RAIZ / "pesquisa" / "dados" / "meega.csv"))
    else:
        print(__doc__)
