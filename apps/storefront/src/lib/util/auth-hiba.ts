import { translator, type Key, type Translate } from "@lib/i18n/dictionary"

import { JELSZO_MIN_HOSSZ } from "./jelszo"

/**
 * A BELEPES ES A REGISZTRACIO HIBAI (P5). A szerver angol, nyers uzenete
 * ("Error: Invalid email or password") eddig valtozatlanul a vevo ele kerult
 * (merve a stage ellen, 2026-09-29). Az ismert eseteknek sajat kodjuk van;
 * minden mas az altalanos kodot kapja, a nyers szoveg nem megy ki.
 *
 * KOD, NEM MONDAT (2026-11-03): a szerver-muvelet nem tudja, milyen nyelven
 * ir, ezert a belepes es a regisztracio KODOT ad vissza (`AuthHibaKod`), a
 * komponens fordit (`authHibaFelirat`, szotar: `account.error.*`). A magyar
 * mondat a szotarban all, nem a koddal egyutt; a meg nem atallitott muveletek
 * (profil, jelszo, szamlazas, cimek) a `authHibaSzoveg`-et hasznaljak, ami a
 * magyar szotar-szoveget adja.
 */
export type AuthHibaKod =
  | "invalid_credentials"
  | "too_many_attempts"
  | "password_short"
  | "email_taken"
  | "generic"
  | "aszf_required"
  | "passwords_differ"
  | "names_required"
  | "all_fields_required"
  | "new_passwords_differ"
  | "current_password_wrong"
  | "billing_address_required"
  | "postcode_four_digits"
  | "company_required"
  | "tax_id_format"
  | "tax_id_invalid"

const ISMERT: readonly [RegExp, AuthHibaKod][] = [
  [/invalid email or password/i, "invalid_credentials"],
  [/too many attempts|too_many_requests/i, "too_many_attempts"],
  [/password must be at least/i, "password_short"],
  [
    /(identity|customer) with email already exists|email already exists/i,
    "email_taken",
  ],
]

const KULCS: Record<AuthHibaKod, Key> = {
  invalid_credentials: "account.error.invalidCredentials",
  too_many_attempts: "account.error.tooManyAttempts",
  password_short: "account.error.passwordShort",
  email_taken: "account.error.emailTaken",
  generic: "account.error.generic",
  aszf_required: "account.error.aszfRequired",
  passwords_differ: "account.error.passwordsDiffer",
  names_required: "account.error.namesRequired",
  all_fields_required: "account.error.allFieldsRequired",
  new_passwords_differ: "account.error.newPasswordsDiffer",
  current_password_wrong: "account.error.currentPasswordWrong",
  billing_address_required: "account.error.billingAddressRequired",
  postcode_four_digits: "account.error.postcodeFourDigits",
  company_required: "account.error.companyRequired",
  tax_id_format: "account.error.taxIdFormat",
  tax_id_invalid: "account.error.taxIdInvalid",
}

/** A nyers hiba kodja: ismert eset, vagy az altalanos. */
export function authHibaKod(hiba: unknown): AuthHibaKod {
  const nyers = hiba instanceof Error ? hiba.message : String(hiba ?? "")
  return ISMERT.find(([minta]) => minta.test(nyers))?.[1] ?? "generic"
}

/** A kod mondata a megadott nyelven (a komponens `useTranslate`-je adja a `t`-t). */
export function authHibaFelirat(kod: AuthHibaKod, t: Translate): string {
  return t(KULCS[kod], { min: JELSZO_MIN_HOSSZ })
}

const magyar = translator("hu")

export const ALTALANOS_AUTH_HIBA = authHibaFelirat("generic", magyar)

/** A hiba MAGYAR mondata: a meg nem atallitott muveletek (profil, jelszo, szamlazas, cimek) ezt kapjak. */
export function authHibaSzoveg(hiba: unknown): string {
  return authHibaFelirat(authHibaKod(hiba), magyar)
}
