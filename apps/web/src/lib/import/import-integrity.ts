export function assertImportedStageCount(expected: number, actual: number) {
  if (expected !== actual) {
    throw new Error(
      `Integridade da importação violada: esperadas ${expected} etapas, mas ${actual} foram gravadas. A operação foi cancelada integralmente.`
    );
  }
}
