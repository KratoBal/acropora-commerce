import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { releaseStaleClaims } from "../workflows/utils/problem-report/report"

/**
 * THE PROBLEM REPORT PHOTOS LEFT UNDER AN ABANDONED CLAIM, EVERY 15 MINUTES (pre-production item, card 2a7acb3b): a
 * report claims its photos under a temporary identifier before it is created, and a process that stops in between
 * leaves them there. One hour old, a claim is abandoned and the photos are freed. See `releaseStaleClaims`.
 */
export default async function problemPhotoClaimCleanupJob(container: MedusaContainer) {
  const freed = await releaseStaleClaims(container)
  if (freed > 0) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .info(`Problem report photos: ${freed} left under an abandoned claim, freed`)
  }
}

export const config = {
  name: "problem-photo-claim-cleanup",
  schedule: "*/15 * * * *",
}
