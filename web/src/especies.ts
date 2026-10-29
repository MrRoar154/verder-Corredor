import type { Cuidado, Especie } from "./api";

export function presentarEspecie(especie: Pick<Especie, "nombreComun" | "nombreCientifico">) {
  const cientifico = especie.nombreCientifico?.trim() || null;
  const mismo =
    cientifico !== null && especie.nombreComun.trim().toLowerCase() === cientifico.toLowerCase();
  return {
    titulo: mismo ? cientifico : especie.nombreComun,
    cientifico: mismo ? null : cientifico,
    faltaNombreComun: mismo,
  };
}

export function fichaVacia(cuidado: Cuidado | null): boolean {
  if (!cuidado) return true;
  return (
    !cuidado.luz &&
    !cuidado.riego &&
    !cuidado.suelo &&
    !cuidado.trasplante &&
    cuidado.plagas.length === 0
  );
}

export function separarLista(valor: string): string[] {
  return valor
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);
}
