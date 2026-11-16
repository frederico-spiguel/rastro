// Atalho para criar elementos: el('button', { class: 'x', onClick: fn }, 'texto')
export function el(tag, props = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') e.value = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    e.append(f instanceof Node ? f : String(f));
  }
  return e;
}

export function trocar(raiz, ...filhos) {
  raiz.replaceChildren(...filhos.flat(Infinity).filter(Boolean));
}
