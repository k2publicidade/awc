/**
 * Valor proveniente de fronteiras JSON dinâmicas e dos delegates genéricos do Prisma.
 * Mantém a ausência de suposições estruturais concentrada nas bordas do sistema.
 */
type DynamicValue = ReturnType<typeof JSON.parse>;
