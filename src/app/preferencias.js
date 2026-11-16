// Preferências do aparelho (fonte, contraste, tema). Ficam só no navegador.
import { lerLocal, gravarLocal } from './servico.js';

const CHAVE = 'rastro.preferencias';
const PADRAO = { fonte: 'normal', contraste: false, tema: 'auto' };

export function lerPreferencias() {
  return { ...PADRAO, ...lerLocal(CHAVE, {}) };
}

export function aplicarPreferencias(p = lerPreferencias()) {
  const html = document.documentElement;
  html.dataset.fonte = p.fonte;
  html.dataset.contraste = p.contraste ? 'alto' : 'normal';
  if (p.tema === 'claro') html.dataset.theme = 'light';
  else if (p.tema === 'escuro') html.dataset.theme = 'dark';
  else delete html.dataset.theme;
}

export function salvarPreferencias(p) {
  gravarLocal(CHAVE, p);
  aplicarPreferencias(p);
}
