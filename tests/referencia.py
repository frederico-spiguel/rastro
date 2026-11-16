"""Executa programas no Python REAL e devolve o histórico de estados no mesmo formato
do motor do Rastro, para os testes compararem os dois.

Entrada (stdin): JSON [{"id", "codigo", "entradas"}]
Saída (stdout):  JSON [{"id", "passos": [{"linha", "vars": {nome: repr}, "saida"}],
                        "saida", "erro": {"tipo", "linha"} | null}]
"""
import io
import json
import sys

ARQUIVO = "<desafio>"
MAX_PASSOS = 2000


class LimiteDoJogo(Exception):
    pass


def executar(codigo, entradas):
    passos = []
    saida = io.StringIO()
    estado = {"linha": None, "pos": 0, "erro": False}
    fila = list(entradas)

    def entrada_falsa(prompt=""):
        saida.write(str(prompt))
        if not fila:
            raise EOFError("sem entradas")
        return fila.pop(0)

    def impressao(*args, sep=" ", end="\n"):
        # print redirecionado para a saída capturada
        saida.write((sep if sep is not None else " ").join(str(a) for a in args)
                    + (end if end is not None else "\n"))

    g = {"__builtins__": __builtins__, "input": entrada_falsa, "print": impressao}
    iniciais = set(g)

    def registrar():
        if estado["linha"] is None:
            return
        texto = saida.getvalue()
        trecho = texto[estado["pos"]:]
        estado["pos"] = len(texto)
        variaveis = {k: repr(v) for k, v in g.items() if k not in iniciais}
        passos.append({"linha": estado["linha"], "vars": variaveis, "saida": trecho})
        if len(passos) > MAX_PASSOS:
            raise LimiteDoJogo()

    def local(frame, evento, arg):
        if evento == "line":
            registrar()
            estado["linha"] = frame.f_lineno
        elif evento == "exception":
            estado["erro"] = True
        elif evento == "return" and not estado["erro"]:
            registrar()
            estado["linha"] = None
        return local

    def global_(frame, evento, arg):
        return local if frame.f_code.co_filename == ARQUIVO else None

    erro = None
    try:
        compilado = compile(codigo, ARQUIVO, "exec")
    except SyntaxError as e:
        return {"passos": [], "saida": "", "erro": {"tipo": "SyntaxError", "linha": e.lineno}}

    sys.settrace(global_)
    try:
        exec(compilado, g)
    except LimiteDoJogo:
        erro = {"tipo": "LimiteDoJogo", "linha": None}
    except Exception as e:  # noqa: BLE001
        linha = None
        tb = e.__traceback__
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == ARQUIVO:
                linha = tb.tb_lineno
            tb = tb.tb_next
        erro = {"tipo": type(e).__name__, "linha": linha}
    finally:
        sys.settrace(None)
    return {"passos": passos, "saida": saida.getvalue(), "erro": erro}


def main():
    # -I ignora PYTHONIOENCODING; força UTF-8 (no Windows o padrão seria cp1252)
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    casos = json.loads(sys.stdin.read())
    resultado = []
    for caso in casos:
        r = executar(caso["codigo"], caso.get("entradas", []))
        r["id"] = caso["id"]
        resultado.append(r)
    sys.stdout.write(json.dumps(resultado, ensure_ascii=False))


if __name__ == "__main__":
    main()
