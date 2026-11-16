// Utilitário de teste: roda os mesmos programas no motor e no Python real e lista diferenças.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { executar, reprPy } from '../src/motor/index.js';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'referencia.py');

let pythonCache;
export function acharPython() {
  if (pythonCache !== undefined) return pythonCache;
  const candidatos = [process.env.PYTHON, 'python3', 'python', 'py'].filter(Boolean);
  pythonCache = null;
  for (const c of candidatos) {
    const r = spawnSync(c, ['--version'], { encoding: 'utf8' });
    if (r.status === 0 && /Python 3\.(1[0-9]|[89])/.test(r.stdout + r.stderr)) {
      pythonCache = c;
      break;
    }
  }
  return pythonCache;
}

export function rodarNoPython(casos) {
  const py = acharPython();
  const r = spawnSync(py, ['-I', SCRIPT], {
    input: JSON.stringify(casos),
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  if (r.status !== 0) throw new Error(`referencia.py falhou:\n${r.stderr}`);
  return JSON.parse(r.stdout);
}

function resumoMotor(caso) {
  const r = executar(caso.codigo, { entradas: caso.entradas ?? [] });
  return {
    passos: r.passos.map((p) => ({
      linha: p.linha,
      vars: Object.fromEntries(Object.entries(p.vars).map(([k, v]) => [k, reprPy(v)])),
      saida: p.saida,
    })),
    saida: r.saida,
    erro: r.erro ? { tipo: r.erro.tipo, linha: r.erro.linha } : null,
  };
}

// Devolve uma lista de textos descrevendo as diferenças (vazia = motor igual ao Python).
export function compararComPython(casos) {
  const referencias = rodarNoPython(casos);
  const problemas = [];
  casos.forEach((caso, i) => {
    const py = referencias[i];
    const js = resumoMotor(caso);
    const dif = diferenca(js, py);
    if (dif) problemas.push(`[${caso.id}] ${dif}\n--- código ---\n${caso.codigo}\n--------------`);
  });
  return problemas;
}

function diferenca(js, py) {
  const n = Math.min(js.passos.length, py.passos.length);
  for (let i = 0; i < n; i++) {
    const a = js.passos[i];
    const b = py.passos[i];
    if (a.linha !== b.linha) return `passo ${i + 1}: motor na linha ${a.linha}, Python na linha ${b.linha}`;
    const va = JSON.stringify(a.vars);
    const vb = JSON.stringify(b.vars);
    if (va !== vb) return `passo ${i + 1} (linha ${a.linha}): variáveis\n  motor:  ${va}\n  python: ${vb}`;
    if (a.saida !== b.saida) {
      return `passo ${i + 1} (linha ${a.linha}): saída\n  motor:  ${JSON.stringify(a.saida)}\n  python: ${JSON.stringify(b.saida)}`;
    }
  }
  if (js.passos.length !== py.passos.length) {
    return `número de passos: motor ${js.passos.length}, Python ${py.passos.length}` +
      ` (linhas motor ${js.passos.map((p) => p.linha).join(',')} | python ${py.passos.map((p) => p.linha).join(',')})`;
  }
  // Para erros de sintaxe e de limite do jogo, a linha exata pode variar: comparamos só o tipo.
  const normalizar = (e) => (e && ['SyntaxError', 'LimiteDoJogo'].includes(e.tipo) ? { tipo: e.tipo } : e);
  const ea = JSON.stringify(normalizar(js.erro));
  const eb = JSON.stringify(normalizar(py.erro));
  if (ea !== eb) return `erro: motor ${ea}, Python ${eb}`;
  return null;
}
