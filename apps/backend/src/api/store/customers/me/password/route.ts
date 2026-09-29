import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { StoreChangePasswordType } from "./validators"

const PROVIDER = "emailpass"

/**
 * POST /store/customers/me/password
 *
 * Changes the signed-in customer's password. Medusa's own
 * `/auth/customer/emailpass/update` accepts only a single-use reset token,
 * which leaves only through the `auth.password_reset` event; we send no email,
 * so the store cannot obtain one. Here the current password stands in for
 * that token: it is checked first, then the same provider update runs.
 *
 * The session comes from Medusa's `/store/customers/me*` middleware. The
 * provider identity is looked up from the session's auth identity, not from a
 * submitted email, so a customer can only change their own password.
 *
 * Known limits (see the PR): existing sessions stay valid after the change
 * (JWTs are not revoked), and there is no rate limit here, as there is none on
 * the sign-in route.
 */
export const POST = async (
  req: MedusaStoreRequest<StoreChangePasswordType>,
  res: MedusaResponse,
) => {
  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized")
  }

  const { current_password, new_password } = req.validatedBody
  const auth = req.scope.resolve(Modules.AUTH)

  const [identity] = await auth.listProviderIdentities({
    auth_identity_id: authIdentityId,
    provider: PROVIDER,
  })
  if (!identity) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This account has no password sign-in",
    )
  }

  // A wrong current password is 400, not 401: the session itself is fine, and
  // a 401 would read as an expired sign-in on the storefront.
  const check = await auth.authenticate(PROVIDER, {
    body: { email: identity.entity_id, password: current_password },
  })
  if (!check.success || check.authIdentity?.id !== authIdentityId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Current password is incorrect",
    )
  }

  const update = await auth.updateProvider(PROVIDER, {
    entity_id: identity.entity_id,
    password: new_password,
  })
  if (!update.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Password could not be changed",
    )
  }

  res.json({ success: true })
}
