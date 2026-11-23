/** The sum of a ledger's rows: the balance. A pure function, so the rule is measured without a database. */
export const sumPoints = (rows: readonly { points: number }[]): number => rows.reduce((sum, row) => sum + row.points, 0)
