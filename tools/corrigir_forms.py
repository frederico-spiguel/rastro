"""Corrige o pré/pós-teste a partir das respostas do Google Forms e gera pesquisa/notas.csv.

Uso:
    python tools/corrigir_forms.py --a respostas-forma-A.csv --b respostas-forma-B.csv

No Google Forms: Respostas > ícone do Planilhas > Arquivo > Fazer download > CSV.

O formulário precisa ter:
  - uma pergunta com "código" no título (ex.: "Código de participante");
  - uma pergunta por variável, com título no formato "Questão 1: valor final de a".

Rubrica: 1 ponto por questão com TODOS os valores pedidos corretos (máximo 8).
O tipo conta: 3 e 3.0 são respostas diferentes. Textos valem com ou sem aspas.
Aceita vírgula decimal ("8,5") e espaços à vontade em listas.
O gabarito vem da execução real (Python) do código de pesquisa/testes.json.
Código ímpar: forma A no pré e B no pós; par: o contrário (pesquisa/codigos.md).
Se alguém enviou o mesmo formulário duas vezes, vale o primeiro envio.
"""
import argparse
import ast
import csv
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
TITULO = re.compile(r"quest\w*\s*(\d+)\D.*\bde\s+(\w+)\s*$", re.IGNORECASE)


def gabarito():
    dados = json.loads((RAIZ / "pesquisa" / "testes.json").read_text(encoding="utf-8"))
    resp = {}
    for q in dados["questoes"]:
        for forma in ("A", "B"):
            vars_ = {}
            exec("\n".join(q[forma]), {}, vars_)  # código do próprio projeto, sem input()
            resp[(forma, q["numero"])] = {v: vars_[v] for v in q["perguntar"]}
    return resp, [q["numero"] for q in dados["questoes"]]


def interpretar(texto):
    t = (texto or "").strip()
    if re.fullmatch(r"-?\d+,\d+", t):
        t = t.replace(",", ".")
    try:
        return ast.literal_eval(t)
    except (ValueError, SyntaxError):
        return t  # texto sem aspas


def correto(texto, esperado):
    valor = interpretar(texto)
    return type(valor) is type(esperado) and valor == esperado


def numero_do_codigo(codigo):
    m = re.search(r"(\d+)\s*$", codigo)
    return int(m.group(1)) if m else None


def ler(caminho, forma, gab, numeros):
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        linhas = list(csv.DictReader(f))
    if not linhas:
        return {}
    cols = list(linhas[0].keys())
    col_codigo = next((c for c in cols if "código" in c.lower() or "codigo" in c.lower()), None)
    if not col_codigo:
        raise SystemExit(f"{caminho}: não achei a coluna do código de participante.")
    mapa = {}
    for c in cols:
        m = TITULO.search(c)
        if m:
            mapa[(int(m.group(1)), m.group(2))] = c
    faltando = [f"Questão {n}: {v}" for n in numeros for v in gab[(forma, n)] if (n, v) not in mapa]
    if faltando:
        raise SystemExit(f"{caminho}: faltam perguntas (confira os títulos): {', '.join(faltando)}")
    notas = {}
    for x in linhas:
        codigo = x[col_codigo].strip().upper().replace(" ", "")
        if not codigo or codigo in notas:
            continue
        acertos = [all(correto(x[mapa[(n, v)]], esp) for v, esp in gab[(forma, n)].items()) for n in numeros]
        notas[codigo] = acertos
    return notas


def main():
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--a", required=True, help="CSV de respostas da forma A")
    ap.add_argument("--b", required=True, help="CSV de respostas da forma B")
    ap.add_argument("--saida", default=str(RAIZ / "pesquisa" / "notas.csv"))
    args = ap.parse_args()
    gab, numeros = gabarito()
    por_forma = {"A": ler(args.a, "A", gab, numeros), "B": ler(args.b, "B", gab, numeros)}

    linhas, avisos = [], []
    for codigo in sorted(set(por_forma["A"]) | set(por_forma["B"])):
        n = numero_do_codigo(codigo)
        if n is None:
            avisos.append(f"{codigo}: código sem número, ignorado")
            continue
        pre, pos = ("A", "B") if n % 2 == 1 else ("B", "A")
        if codigo not in por_forma[pre] or codigo not in por_forma[pos]:
            avisos.append(f"{codigo}: falta o {'pré' if codigo not in por_forma[pre] else 'pós'}-teste (forma {pre if codigo not in por_forma[pre] else pos})")
            continue
        a_pre, a_pos = por_forma[pre][codigo], por_forma[pos][codigo]
        linha = {"codigo": codigo, "forma_pre": pre, "pre": sum(a_pre), "pos": sum(a_pos)}
        for num, ok in zip(numeros, a_pre):
            linha[f"pre_q{num}"] = int(ok)
        for num, ok in zip(numeros, a_pos):
            linha[f"pos_q{num}"] = int(ok)
        linhas.append(linha)

    if linhas:
        with open(args.saida, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()))
            w.writeheader()
            w.writerows(linhas)
    print(f"{len(linhas)} participante(s) com pré e pós corrigidos -> {args.saida}")
    for a in avisos:
        print("Aviso:", a)


if __name__ == "__main__":
    main()
