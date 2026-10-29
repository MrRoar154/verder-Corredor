export function idValido(valor: string | string[] | undefined): bigint | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  if (!texto || !/^\d+$/.test(texto)) return null;
  try {
    return BigInt(texto);
  } catch {
    return null;
  }
}

export function vacioANulo(valor: string | undefined): string | null {
  const limpio = valor?.trim() ?? "";
  return limpio.length > 0 ? limpio : null;
}
