/**
 * THE WITHDRAWAL A CUSTOMER DECLARES FROM THE ORDER PAGE (V0.3, 45/2014. Korm. rendelet 22. §, in force for online
 * orders since 2026-06-19). The shop stores the declaration; the OS PULLS it and shows it at the order (the same way
 * as the problem reports: no new public OS endpoint).
 *
 * The shop RECORDS, it does not decide: whether the right exists for these lines (the 14 days, the goods the right
 * does not cover, a company as buyer) is for the OS side and for the owner. A declaration is accepted whenever the
 * order and the address match, because the function must not turn a customer away.
 */

/** new: waiting for the OS; pulled: the OS has it (shown at the order there). */
export const WITHDRAWAL_STATUSES = ["new", "pulled"] as const
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number]
