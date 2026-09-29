import { Metadata } from "next"
import { STORE_NAME } from "@lib/store"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Bejelentkezés",
  description: `Lépj be a(z) ${STORE_NAME} fiókodba.`,
}

export default function Login() {
  return <LoginTemplate />
}
