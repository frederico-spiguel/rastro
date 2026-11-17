"""Gera as imagens do código do pré/pós-teste para colar no Google Forms.

Uso:  python tools/gerar_imagens_forms.py
Lê    pesquisa/testes.json
Gera  pesquisa/forms/forma-A/questao-1.png ... e forma-B/... (fora do git, ver .gitignore)

Precisa do Pillow (pip install pillow) e da fonte Consolas (Windows) ou DejaVu Sans Mono.
"""
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
ESCALA = 2  # imagem em dobro para ficar nítida
TAM = 22 * ESCALA
MARGEM = 24 * ESCALA
ENTRE = int(TAM * 1.55)

FUNDO = (250, 250, 247)
BORDA = (210, 210, 200)
TEXTO = (30, 30, 30)
NUM_LINHA = (150, 150, 150)
CORES = {"chave": (150, 40, 150), "numero": (20, 100, 160), "texto": (40, 130, 40), "embutida": (170, 90, 0)}
CHAVES = {"if", "elif", "else", "while", "for", "in", "and", "or", "not", "True", "False"}
EMBUTIDAS = {"range", "len", "print", "input", "int", "float", "str", "abs", "min", "max", "sum", "append"}
TOKEN = re.compile(r'("[^"]*"|\'[^\']*\'|\d+\.?\d*|[A-Za-z_]\w*|\s+|.)')


def fonte():
    for nome in ("consola.ttf", "C:/Windows/Fonts/consola.ttf", "DejaVuSansMono.ttf"):
        try:
            return ImageFont.truetype(nome, TAM)
        except OSError:
            pass
    raise SystemExit("Fonte monoespaçada não encontrada (Consolas ou DejaVu Sans Mono).")


def cor(tok):
    if tok[0] in "\"'":
        return CORES["texto"]
    if tok[0].isdigit():
        return CORES["numero"]
    if tok in CHAVES:
        return CORES["chave"]
    if tok in EMBUTIDAS:
        return CORES["embutida"]
    return TEXTO


def desenhar(linhas, destino, f):
    larg_char = f.getlength("M")
    col_num = len(str(len(linhas))) + 2
    largura = int(MARGEM * 2 + larg_char * (col_num + max(len(l) for l in linhas)))
    largura = max(largura, 420 * ESCALA)
    altura = MARGEM * 2 + ENTRE * len(linhas)
    img = Image.new("RGB", (largura, altura), FUNDO)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, largura - 1, altura - 1], outline=BORDA, width=ESCALA)
    for i, linha in enumerate(linhas):
        y = MARGEM + i * ENTRE
        d.text((MARGEM, y), str(i + 1).rjust(col_num - 2), font=f, fill=NUM_LINHA)
        x = MARGEM + larg_char * col_num
        for tok in TOKEN.findall(linha):
            d.text((x, y), tok, font=f, fill=cor(tok))
            x += f.getlength(tok)
    destino.parent.mkdir(parents=True, exist_ok=True)
    img.save(destino)


def main():
    dados = json.loads((RAIZ / "pesquisa" / "testes.json").read_text(encoding="utf-8"))
    f = fonte()
    for q in dados["questoes"]:
        for forma in ("A", "B"):
            destino = RAIZ / "pesquisa" / "forms" / f"forma-{forma}" / f"questao-{q['numero']}.png"
            desenhar(q[forma], destino, f)
            print(destino.relative_to(RAIZ))


if __name__ == "__main__":
    main()
