"use server"

import { sdk } from "@lib/config"
import {
  ASZF_METADATA_KULCS,
  aszfElfogadas,
  regisztracioHiba,
} from "@lib/util/aszf"
import { ALTALANOS_AUTH_HIBA, authHibaSzoveg } from "@lib/util/auth-hiba"
import { alapertelmezettUrlapbol, cimNevUrlapbol } from "@lib/util/cim"
import {
  ADOSZAM_METADATA_KULCS,
  adoszamEgysegesitve,
  szamlazasiHiba,
  type SzamlazasiTipus,
} from "@lib/util/szamlazas"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { FetchError } from "@medusajs/js-sdk"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  getPendingCustomer,
  removeAuthToken,
  removeCartId,
  removePendingCustomer,
  setAuthToken,
  setPendingCustomer,
} from "./cookies"

export type CustomerAuthState =
  // `ertekek`: the submitted values (never the passwords), so the form can
  // refill after React 19 resets it following the action.
  | { state: "error"; error: string; ertekek?: Record<string, string> }
  | { state: "verification_required"; email: string }
  | { state: "success" }
  | null

// Requests a verification email for the given customer. The request must be
// authenticated with a token tied to the auth identity (the token returned by
// register or by a login that requires verification).
async function requestVerificationEmail(email: string, token: string) {
  await sdk.auth.verification.request(
    {
      entity_id: email,
      entity_type: "email",
    },
    {
      authorization: `Bearer ${token}`,
    },
  )
}

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

export type ProfilMentesAllapot =
  | { state: "success" }
  // `ertekek`: the submitted values, so the form refills after the reset.
  | { state: "error"; error: string; ertekek: Record<string, string> }
  | null

/**
 * A PROFIL MENTESE (P5, 257:3): egy urlap, egy "Mentés". A nev ket mezo, a
 * telefonszam opcionalis. Az e-mail itt nem modosithato: a Medusa bolti
 * API-janak vevo-frissitese kizarja (`StoreUpdateCustomer` Omit "email").
 */
export async function saveProfile(
  _currentState: unknown,
  formData: FormData,
): Promise<ProfilMentesAllapot> {
  const first_name = String(formData.get("first_name") ?? "").trim()
  const last_name = String(formData.get("last_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const ertekek = { first_name, last_name, phone }

  if (!first_name || !last_name) {
    return {
      state: "error",
      error: "A vezetéknév és a keresztnév kötelező.",
      ertekek,
    }
  }

  try {
    // An emptied phone is sent as null, so it is cleared; undefined would keep
    // the old number.
    await updateCustomer({ first_name, last_name, phone: phone || null })
  } catch (error) {
    return { state: "error", error: authHibaSzoveg(error), ertekek }
  }

  return { state: "success" }
}

export type SzamlazasMentesAllapot =
  | { state: "success" }
  | {
      state: "error"
      error: string
      /**
       * A BEKULDOTT ERTEKEK. A React 19 egy form action utan alaphelyzetbe
       * allitja az urlapot (a mezok a `defaultValue`-ra allnak vissza): e
       * nelkul egy hibas bekuldes kiuritene mindent, amit a vevo beirt
       * (mérve a stage ellen, 2026-09-29).
       */
      ertekek: Record<string, string>
    }
  | null

/**
 * A SZAMLAZASI ADATOK MENTESE (P5, 257:102). A vevo ALAPERTELMEZETT
 * SZAMLAZASI CIMET irja (`is_default_billing`): ha van, frissiti, ha nincs,
 * letrehozza. A nev a vevoe (a keret nem ker nevet); cegnel a cegnev a
 * `company`, az adoszam egysegesitve a `metadata.tax_id` (acrobot dontese);
 * maganszemelynel mind a ketto `null`. A tobbi metadata kulcs marad.
 */
export async function saveBilling(
  _currentState: unknown,
  formData: FormData,
): Promise<SzamlazasMentesAllapot> {
  const mezo = (nev: string) => String(formData.get(nev) ?? "").trim()
  const tipus: SzamlazasiTipus =
    formData.get("tipus") === "ceg" ? "ceg" : "maganszemely"
  const urlap = {
    tipus,
    ceg: mezo("company"),
    adoszam: mezo("tax_id"),
    iranyitoszam: mezo("postal_code"),
    varos: mezo("city"),
    utca: mezo("address_1"),
  }

  const ertekek = {
    company: urlap.ceg,
    tax_id: urlap.adoszam,
    postal_code: urlap.iranyitoszam,
    city: urlap.varos,
    address_1: urlap.utca,
  }

  const hiba = szamlazasiHiba(urlap)
  if (hiba) return { state: "error", error: hiba, ertekek }

  const vevo = await retrieveCustomer()
  if (!vevo) return { state: "error", error: ALTALANOS_AUTH_HIBA, ertekek }

  const meglevo = (vevo.addresses ?? []).find((c) => c.is_default_billing)
  const ceges = tipus === "ceg"
  const cim = {
    first_name: vevo.first_name ?? undefined,
    last_name: vevo.last_name ?? undefined,
    company: ceges ? urlap.ceg : null,
    address_1: urlap.utca,
    city: urlap.varos,
    postal_code: urlap.iranyitoszam,
    country_code: "hu",
    metadata: {
      ...(meglevo?.metadata ?? {}),
      [ADOSZAM_METADATA_KULCS]: ceges
        ? adoszamEgysegesitve(urlap.adoszam)
        : null,
    },
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    if (meglevo) {
      await sdk.store.customer.updateAddress(meglevo.id, cim, {}, headers)
    } else {
      await sdk.store.customer.createAddress(
        {
          ...cim,
          // Medusa does not separate billing from shipping addresses, so the
          // new one also shows under Címek: its name makes it recognizable.
          address_name: "Számlázási cím",
          is_default_billing: true,
          is_default_shipping: false,
        },
        {},
        headers,
      )
    }
  } catch (error) {
    return { state: "error", error: authHibaSzoveg(error), ertekek }
  }

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)
  return { state: "success" }
}

export async function signup(
  _currentState: unknown,
  formData: FormData,
): Promise<CustomerAuthState> {
  // The passwords are not sent back: they are typed again.
  const ertekek = {
    last_name: String(formData.get("last_name") ?? ""),
    first_name: String(formData.get("first_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    aszf: formData.get("aszf") ? "on" : "",
  }
  const eredmeny = await regisztral(formData)
  return eredmeny?.state === "error" ? { ...eredmeny, ertekek } : eredmeny
}

async function regisztral(formData: FormData): Promise<CustomerAuthState> {
  const password = formData.get("password") as string

  // The checkbox and the repeated password are checked on the server too: the
  // browser's `required` does not stop a direct POST.
  const hiba = regisztracioHiba({
    aszf: formData.get("aszf"),
    jelszo: formData.get("password"),
    jelszoUjra: formData.get("password_again"),
  })
  if (hiba) return { state: "error", error: hiba }

  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: (formData.get("phone") as string | null) ?? undefined,
    // The acceptance is recorded at submit time and survives email
    // verification in the pending-customer cookie.
    metadata: { [ASZF_METADATA_KULCS]: aszfElfogadas(new Date()) },
  }

  try {
    await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password,
    })
  } catch (error) {
    const fetchError = error as FetchError
    // An existing identity (for example, an admin user with the same email) is
    // expected and handled: the customer can still log in to link a customer
    // record. Any other error is surfaced.
    if (
      fetchError.statusText !== "Unauthorized" ||
      fetchError.message !== "Identity with email already exists"
    ) {
      return { state: "error", error: authHibaSzoveg(error) }
    }
  }

  // Persist the extra signup fields. The customer record is created during
  // login, which is deferred until after email verification when the backend
  // requires it.
  await setPendingCustomer(customerForm)

  // Continue by logging in. The login response tells us whether the backend
  // requires email verification — we don't need a storefront-side flag.
  return completeLogin(customerForm.email, password)
}

export async function login(
  _currentState: unknown,
  formData: FormData,
): Promise<CustomerAuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const eredmeny = await completeLogin(email, password)
  // The email is sent back so the form refills after the reset; the password
  // is not.
  return eredmeny?.state === "error"
    ? { ...eredmeny, ertekek: { email: String(email ?? "") } }
    : eredmeny
}

// Logs the customer in and reconciles the customer record. The behavior is
// driven entirely by the backend's login response, so it works whether or not
// email verification is enabled.
async function completeLogin(
  email: string,
  password: string,
): Promise<CustomerAuthState> {
  let result: Awaited<ReturnType<typeof sdk.auth.login>>

  try {
    result = await sdk.auth.login("customer", "emailpass", { email, password })
  } catch (error) {
    return { state: "error", error: authHibaSzoveg(error) }
  }

  // A `location` is returned by third-party auth providers, which this flow
  // doesn't support.
  if (typeof result === "object" && "location" in result) {
    return {
      state: "error",
      error: ALTALANOS_AUTH_HIBA,
    }
  }

  // The backend requires email verification and the customer hasn't verified
  // yet. Send the verification email and ask them to check their inbox.
  if (
    typeof result === "object" &&
    "verification_required" in result &&
    result.verification_required
  ) {
    try {
      await requestVerificationEmail(email, result.token)
    } catch {
      // Ignore: the customer can resend from the verification page.
    }
    return { state: "verification_required", email }
  }

  if (typeof result !== "string") {
    return {
      state: "error",
      error: ALTALANOS_AUTH_HIBA,
    }
  }

  let token = result

  // The token may not be tied to a customer record yet — right after
  // registration, or after verifying a brand-new account. Ask the backend:
  // `/store/customers/me` rejects tokens without a registered actor, so a
  // failed retrieve means we still need to create the customer, then log in
  // again to obtain a customer-bound token.
  const customerExists = await sdk.store.customer
    .retrieve({}, { authorization: `Bearer ${token}` })
    .then(() => true)
    .catch(() => false)

  if (!customerExists) {
    const pending = await getPendingCustomer()

    try {
      await sdk.store.customer.create(
        {
          email,
          first_name: pending?.first_name,
          last_name: pending?.last_name,
          phone: pending?.phone,
          metadata: pending?.metadata,
        },
        {},
        { authorization: `Bearer ${token}` },
      )

      token = (await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })) as string
    } catch (error) {
      return { state: "error", error: authHibaSzoveg(error) }
    }

    await removePendingCustomer()
  }

  await setAuthToken(token)

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  try {
    await transferCart()
  } catch (error) {
    return { state: "error", error: authHibaSzoveg(error) }
  }

  return { state: "success" }
}

// Confirms a customer's email using the token from the verification link.
//
// The confirm route doesn't require authentication, so this works even when the
// customer opens the link on a different device than the one they signed up on.
export async function confirmEmailVerification(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await sdk.auth.verification.confirm({ code: token })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  redirect(`/${countryCode}/account`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData,
): Promise<{ success: boolean; error: string | null }> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping:
      alapertelmezettUrlapbol(formData, isDefaultShipping) ?? false,
    // P5 (257:51): the address's own name ("Otthon"), when the form has it.
    address_name: cimNevUrlapbol(formData) ?? undefined,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: authHibaSzoveg(err) }
    })
}

export const deleteCustomerAddress = async (
  addressId: string,
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData,
): Promise<{ success: boolean; error: string | null }> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  // P5 (257:51): the name and the default flag, only when the form has them.
  const cimNev = cimNevUrlapbol(formData)
  if (cimNev !== undefined) address.address_name = cimNev
  const alapertelmezett = alapertelmezettUrlapbol(formData, undefined)
  if (alapertelmezett !== undefined) {
    address.is_default_shipping = alapertelmezett
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: authHibaSzoveg(err) }
    })
}
