"""Análise do piloto do Rastro (só biblioteca padrão do Python).

Uso:
    python tools/analisar_piloto.py --notas pesquisa/notas.csv \
        [--eventos eventos.csv] [--meega meega.csv] [--saida pesquisa/resultados.md]

Arquivos:
  notas.csv   colunas codigo, forma_pre, pre, pos   (pontos de 0 a 8; modelo em pesquisa/notas-modelo.csv)
  eventos.csv exportado da visão `analise_eventos` do Supabase
              (colunas codigo_participante, tipo, desafio, comando, dados ...)
  meega.csv   uma linha por participante; colunas de itens no formato `fator:item` com valores -2..2

Estatística (piloto exploratório, sem grupo de controle):
  - ganho = pos - pre por participante; ganho normalizado = (pos - pre) / (8 - pre)
  - teste de Wilcoxon pareado (exato, com empates) e correlação rank-bisserial como tamanho de efeito
"""
import argparse
import csv
import json
import statistics
from collections import Counter, defaultdict

TOTAL = 8


def postos(valores):
    """Postos médios (1..n) com empates."""
    ordem = sorted(range(len(valores)), key=lambda i: valores[i])
    r = [0.0] * len(valores)
    i = 0
    while i < len(ordem):
        j = i
        while j + 1 < len(ordem) and valores[ordem[j + 1]] == valores[ordem[i]]:
            j += 1
        for k in range(i, j + 1):
            r[ordem[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def wilcoxon(diferencas):
    """Wilcoxon de postos sinalizados, bilateral e exato (zeros descartados).
    Devolve (n, W+, W-, p, r_bisserial)."""
    d = [x for x in diferencas if x != 0]
    n = len(d)
    if n == 0:
        return 0, 0.0, 0.0, 1.0, 0.0
    r = postos([abs(x) for x in d])
    w_mais = sum(rk for rk, x in zip(r, d) if x > 0)
    w_menos = sum(rk for rk, x in zip(r, d) if x < 0)
    # distribuição exata de W+ sob H0 (postos dobrados viram inteiros, por causa dos empates)
    dobrados = [int(round(2 * x)) for x in r]
    dist = Counter({0: 1})
    for rk in dobrados:
        nova = Counter(dist)
        for soma, cont in dist.items():
            nova[soma + rk] += cont
        dist = nova
    total = 2 ** n
    menor = min(w_mais, w_menos) * 2
    p = min(1.0, 2 * sum(c for s, c in dist.items() if s <= menor + 1e-9) / total)
    r_bis = (w_mais - w_menos) / (w_mais + w_menos)
    return n, w_mais, w_menos, p, r_bis


def ler_csv(caminho):
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def analisar_notas(caminho, out):
    linhas = ler_csv(caminho)
    pre = [float(x["pre"]) for x in linhas]
    pos = [float(x["pos"]) for x in linhas]
    ganhos = [b - a for a, b in zip(pre, pos)]
    norm = [(b - a) / (TOTAL - a) for a, b in zip(pre, pos) if a < TOTAL]
    n, wm, wme, p, rb = wilcoxon(ganhos)
    out.append("## Pré/pós-teste\n")
    out.append(f"Participantes: {len(linhas)}\n")
    out.append("| Medida | Pré | Pós |\n|---|---|---|")
    out.append(f"| Mediana | {statistics.median(pre):g} | {statistics.median(pos):g} |")
    out.append(f"| Média | {statistics.mean(pre):.2f} | {statistics.mean(pos):.2f} |\n")
    out.append(f"- Mediana do ganho: {statistics.median(ganhos):g} ponto(s)")
    out.append(f"- Melhoraram: {sum(g > 0 for g in ganhos)}; iguais: {sum(g == 0 for g in ganhos)}; pioraram: {sum(g < 0 for g in ganhos)}")
    if norm:
        out.append(f"- Ganho normalizado (mediana): {statistics.median(norm):.2f}")
    out.append(f"- Wilcoxon pareado: n = {n} (ganhos zero descartados), W+ = {wm:g}, W- = {wme:g}, p = {p:.4f} (bilateral, exato)")
    out.append(f"- Tamanho de efeito (rank-bisserial): r = {rb:.2f}")
    criterio = statistics.median(ganhos) > 0 and sum(g < 0 for g in ganhos) <= len(ganhos) / 2
    out.append(f"- Critério proposto (mediana do ganho > 0 e maioria sem piora): {'ATENDIDO' if criterio else 'não atendido'}\n")
    out.append("| Código | Forma pré | Pré | Pós | Ganho |\n|---|---|---|---|---|")
    for x, g in zip(linhas, ganhos):
        out.append(f"| {x['codigo']} | {x.get('forma_pre', '')} | {x['pre']} | {x['pos']} | {g:+g} |")
    for forma in ("A", "B"):
        sub = [float(x["pre"]) for x in linhas if x.get("forma_pre") == forma]
        if sub:
            out.append(f"\nMédia no pré-teste com a forma {forma}: {statistics.mean(sub):.2f} (n = {len(sub)})")
    out.append("")


def analisar_eventos(caminho, out):
    linhas = ler_csv(caminho)
    erros_cmd = Counter()
    erros_desafio = Counter()
    dicas = Counter()
    fins = []
    for x in linhas:
        dados = x.get("dados") or "{}"
        try:
            dados = json.loads(dados)
        except json.JSONDecodeError:
            dados = {}
        if x["tipo"] == "passo_erro":
            erros_cmd[x.get("comando") or dados.get("comando") or "?"] += 1
            erros_desafio[x.get("desafio") or "?"] += 1
        elif x["tipo"] == "dica":
            dicas[x.get("desafio") or "?"] += 1
        elif x["tipo"] == "desafio_fim":
            fins.append(dados)
    out.append("## Registros de uso\n")
    out.append(f"Desafios concluídos: {len(fins)}")
    if fins:
        out.append(f"Tempo mediano por desafio: {statistics.median(f.get('segundos', 0) for f in fins):g} s")
    out.append("\n### Erros por tipo de comando\n\n| Comando | Erros |\n|---|---|")
    for c, n in erros_cmd.most_common():
        out.append(f"| {c} | {n} |")
    out.append("\n### Desafios com mais erros\n\n| Desafio | Erros | Dicas |\n|---|---|---|")
    for d, n in erros_desafio.most_common(10):
        out.append(f"| {d} | {n} | {dicas.get(d, 0)} |")
    out.append("")


def analisar_meega(caminho, out):
    linhas = ler_csv(caminho)
    por_fator = defaultdict(list)
    for x in linhas:
        for col, v in x.items():
            if ":" in col and v not in ("", None):
                por_fator[col.split(":")[0]].append(float(v))
    out.append("## MEEGA+\n\n| Fator | Mediana | % positivas | Respostas |\n|---|---|---|---|")
    for f, vs in sorted(por_fator.items()):
        pos = 100 * sum(v > 0 for v in vs) / len(vs)
        out.append(f"| {f} | {statistics.median(vs):g} | {pos:.0f}% | {len(vs)} |")
    out.append("")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--notas", required=True)
    ap.add_argument("--eventos")
    ap.add_argument("--meega")
    ap.add_argument("--saida", default="pesquisa/resultados.md")
    a = ap.parse_args()
    out = ["# Resultados do piloto do Rastro (exploratório)\n",
           "Sem grupo de controle e com amostra pequena: os resultados não são generalizáveis.\n"]
    analisar_notas(a.notas, out)
    if a.eventos:
        analisar_eventos(a.eventos, out)
    if a.meega:
        analisar_meega(a.meega, out)
    with open(a.saida, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print(f"Resultados em {a.saida}")


if __name__ == "__main__":
    main()
