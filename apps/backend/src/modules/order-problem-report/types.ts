/**
 * THE PROBLEM REPORT A CUSTOMER FILES FROM THE ORDER PAGE (V1.2): "Probléma a szállítmánnyal". The
 * shop stores it, with the photos; the OS PULLS it and opens a ticket (acrobot's decision, 2026-11-04:
 * no new public OS endpoint).
 */
export const PROBLEM_KINDS = ["animal_dead", "animal_hurt", "item_damaged", "item_missing", "other"] as const
export type ProblemKind = (typeof PROBLEM_KINDS)[number]

/** new: waiting for the OS; pulled: the OS has it (a ticket was opened there). */
export const PROBLEM_STATUSES = ["new", "pulled"] as const
export type ProblemStatus = (typeof PROBLEM_STATUSES)[number]
