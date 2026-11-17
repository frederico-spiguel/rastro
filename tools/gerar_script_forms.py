"""Gera um Google Apps Script que cria os formulários do pré/pós-teste (formas A e B).

Uso:  python tools/gerar_imagens_forms.py   (antes, para ter as imagens)
      python tools/gerar_script_forms.py
Gera  pesquisa/forms/criar-formularios.gs (fora do git: contém as questões)

Depois: script.google.com > Novo projeto > colar tudo > Executar `criarFormularios`.
Os links aparecem no "Registro de execução".
"""
import base64
import io
import json
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent

DESCRICAO = (
    "Para cada programa em Python, escreva o valor FINAL das variáveis pedidas, depois de o "
    "programa inteiro ser executado. Não use computador nem execute o código; pode usar papel "
    "para rabiscar. Atenção ao tipo: escreva 4.0 se o valor for float (decimal) e 4 se for "
    "inteiro. Textos podem ir com ou sem aspas. Listas como [1, 2, 3]. Se não souber, deixe em "
    "branco. Tempo sugerido: 15 minutos."
)


def png_base64(caminho):
    img = Image.open(caminho).convert("RGB").quantize(colors=32)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def main():
    dados = json.loads((RAIZ / "pesquisa" / "testes.json").read_text(encoding="utf-8"))
    formas = {}
    for forma in ("A", "B"):
        formas[forma] = [
            {
                "numero": q["numero"],
                "variaveis": q["perguntar"],
                "imagem": png_base64(RAIZ / "pesquisa" / "forms" / f"forma-{forma}" / f"questao-{q['numero']}.png"),
            }
            for q in dados["questoes"]
        ]
    js = f"""// Gerado por tools/gerar_script_forms.py. Executar: criarFormularios
const DESCRICAO = {json.dumps(DESCRICAO, ensure_ascii=False)};
const FORMAS = {json.dumps(formas)};

function criarForma(letra) {{
  const form = FormApp.create('Rastro: teste (forma ' + letra + ')');
  form.setDescription(DESCRICAO);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Respostas enviadas. Obrigado! Pode voltar para o Rastro.');
  form.addTextItem().setTitle('Código de participante')
    .setHelpText('O mesmo código usado no jogo (ex.: RST07).').setRequired(true);
  FORMAS[letra].forEach(function (q) {{
    form.addPageBreakItem().setTitle('Questão ' + q.numero);
    const blob = Utilities.newBlob(Utilities.base64Decode(q.imagem), 'image/png', 'questao-' + q.numero + '.png');
    form.addImageItem().setImage(blob).setTitle('Questão ' + q.numero);
    q.variaveis.forEach(function (v) {{
      form.addTextItem().setTitle('Questão ' + q.numero + ': valor final de ' + v);
    }});
  }});
  return form;
}}

function criarFormularios() {{
  ['A', 'B'].forEach(function (letra) {{
    const form = criarForma(letra);
    Logger.log('FORMA ' + letra + ' RESPONDER: ' + form.shortenFormUrl(form.getPublishedUrl()));
    Logger.log('FORMA ' + letra + ' EDITAR: ' + form.getEditUrl());
  }});
}}
"""
    destino = RAIZ / "pesquisa" / "forms" / "criar-formularios.gs"
    destino.write_text(js, encoding="utf-8")
    print(f"{destino.relative_to(RAIZ)}: {len(js) // 1024} KB")


if __name__ == "__main__":
    main()
