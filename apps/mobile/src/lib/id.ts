/** Gerador de id local (sem dependência de crypto, suficiente para fila offline). */
export function genId(): string {
  return `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
