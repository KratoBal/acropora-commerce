import { DEFAULT_LOCALE, type Locale } from "../locale"
import { en } from "./en"
import { hu } from "./hu"

/** The shape of a dictionary: the Hungarian one with every leaf a plain `string` (so the English one need not repeat the exact words). */
type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>
}
export type Dictionary = DeepString<typeof hu>

/** Every key as a dotted path: `category.addToCart`, `category.helper.livestock.title`. */
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : Paths<T[K], `${P}${K}.`>
}[keyof T & string]
export type Key = Paths<Dictionary>

const dictionaries: Record<Locale, Dictionary> = { hu, en }

export const getDictionary = (locale: Locale): Dictionary =>
  dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]

export type Params = Record<string, string | number>
export type Translate = (key: Key, params?: Params) => string

/** `{name}` placeholders filled from `params`; a placeholder without a value is left as written (visible, not silent). */
export const fill = (text: string, params?: Params): string =>
  params
    ? text.replace(/\{(\w+)\}/g, (whole, name: string) =>
        name in params ? String(params[name]) : whole,
      )
    : text

const lookup = (dictionary: Dictionary, key: string): string | undefined => {
  let node: unknown = dictionary
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === "string" ? node : undefined
}

/**
 * The translator for a language. A key the language lacks falls back to the Hungarian text, and a key neither has to the key itself:
 * a gap shows as a gap, never as an empty string. (The types make both impossible for a typed `Key`; this is for a key built at run time.)
 */
export const translator = (locale: Locale): Translate => {
  const dictionary = getDictionary(locale)
  return (key, params) =>
    fill(
      lookup(dictionary, key) ??
        lookup(dictionaries[DEFAULT_LOCALE], key) ??
        key,
      params,
    )
}
