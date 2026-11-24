import { cloneElement, isValidElement, type ReactNode } from "react"

const AsyncFunction = (async () => {}).constructor

/**
 * EGY SZERVER-KOMPONENS FA, A TESZTNEK KIRAJZOLHATÓ ALAKBAN. A Testing Library a böngésző Reactjával rajzol, az pedig az async
 * komponenst nem rajzolja ki („async Client Component”). Egy szerver-komponens, ami a vevői szövegek miatt (`vevoiForditas`,
 * kártya 7bfca4eb) `await`-tel kéri a fordítóját, ezért a fában feloldva kerül a `render` elé: minden async komponenst meghívunk a
 * propjaival, és a válaszát is feloldjuk, a `children` és az elemet tartó propok mentén.
 *
 * AMIT NEM LÁT: egy SZINKRON komponens törzsében létrehozott async elemet (azt csak a kirajzolás hozza létre). Az ilyen fa a
 * `render`-ben a fenti hibával bukik, tehát nem némán.
 */
export async function szerverFa(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(szerverFa))
  if (!isValidElement<Record<string, unknown>>(node)) return node
  if (node.type instanceof AsyncFunction)
    return szerverFa(
      await (node.type as (props: unknown) => Promise<ReactNode>)(node.props),
    )
  const props: Record<string, unknown> = {}
  for (const [nev, ertek] of Object.entries(node.props))
    if (nev === "children" || isValidElement(ertek))
      props[nev] = await szerverFa(ertek as ReactNode)
  return Object.keys(props).length ? cloneElement(node, props) : node
}
