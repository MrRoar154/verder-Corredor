export type Trozo = { tipo: "texto" | "enlace"; valor: string };

const ENLACE = /https?:\/\/[^\s<>"']+/gi;

export function partirEnlaces(texto: string): Trozo[] {
  const trozos: Trozo[] = [];
  let cursor = 0;
  for (const coincidencia of texto.matchAll(ENLACE)) {
    const inicio = coincidencia.index ?? 0;
    if (inicio > cursor) {
      trozos.push({ tipo: "texto", valor: texto.slice(cursor, inicio) });
    }
    let url = coincidencia[0];
    let sobra = "";
    while (url.length > 0 && /[.,;:!?)]$/.test(url)) {
      sobra = url.slice(-1) + sobra;
      url = url.slice(0, -1);
    }
    if (/^https?:\/\//i.test(url)) trozos.push({ tipo: "enlace", valor: url });
    if (sobra) trozos.push({ tipo: "texto", valor: sobra });
    cursor = inicio + coincidencia[0].length;
  }
  if (cursor < texto.length) trozos.push({ tipo: "texto", valor: texto.slice(cursor) });
  if (trozos.length === 0) trozos.push({ tipo: "texto", valor: texto });
  return trozos;
}

export function tieneEnlace(texto: string): boolean {
  return /https?:\/\//i.test(texto);
}
