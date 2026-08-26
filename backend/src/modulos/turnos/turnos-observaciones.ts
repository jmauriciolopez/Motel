export function agregarObservacion(
  observacionActual: string | null | undefined,
  nuevaObservacion: string,
): string {
  const actual = observacionActual?.trim() || '';
  const nueva = nuevaObservacion.trim();

  if (!nueva) return actual;
  if (!actual) return nueva;
  if (actual.includes(nueva)) return actual;

  return `${actual}\n${nueva}`;
}

export function preservarObservacionAnterior(
  observacionAnterior: string | null | undefined,
  observacionSolicitada: string | null | undefined,
): string | null | undefined {
  const anterior = observacionAnterior?.trim() || '';
  const solicitada = observacionSolicitada?.trim() || '';

  if (!anterior) return observacionSolicitada;
  if (!solicitada) return anterior;
  if (solicitada.includes(anterior)) return observacionSolicitada;

  return `${solicitada}\n${anterior}`;
}