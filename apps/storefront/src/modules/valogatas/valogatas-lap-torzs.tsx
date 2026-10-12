import { notFound } from "next/navigation"

import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import {
  valogatasHandleAlapjan,
  valogatasTermekAzonositok,
} from "@lib/data/valogatas"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { valogatasErvenyes, valogatasLapja } from "@lib/util/valogatas"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { lapozoKeres } from "@modules/store/components/pagination/lap-href"

/**
 * A VÁLOGATÁS LAPJÁNAK TÖRZSE (t10), az alap-, a lapozott és a szűrt út közös
 * része. A termékek a commerce azonosító-listájából jönnek, laponként 12-vel,
 * az eredeti sorrendben (a legújabb elöl).
 */
export async function valogatasLapTorzs(
  params: { handle: string; countryCode: string },
  keres: Record<string, string | string[] | undefined>,
) {
  const handle = decodeHandleParam(params.handle)
  const valogatas = await valogatasHandleAlapjan(handle)
  if (!valogatas || !valogatasErvenyes(valogatas.filter)) notFound()

  const azonositok = (await valogatasTermekAzonositok(handle)) ?? []
  const lapSzam = typeof keres.page === "string" ? Number(keres.page) : 1
  const lap = valogatasLapja(azonositok, lapSzam)
  if (!lap.letezik) notFound()

  const region = await getRegion(params.countryCode)
  if (!region) notFound()

  const termekek = lap.azonositok.length
    ? await listProducts({
        countryCode: params.countryCode,
        queryParams: { id: lap.azonositok, limit: lap.azonositok.length },
      }).then(({ response }) => {
        const szerint = new Map(response.products.map((p) => [p.id, p]))
        return lap.azonositok.flatMap((id) => szerint.get(id) ?? [])
      })
    : []

  return (
    <div className="py-6 content-container">
      <div className="mb-8">
        <h1 className="text-2xl-semi">{valogatas.title}</h1>
        {valogatas.intro ? (
          <p className="mt-4 max-w-3xl whitespace-pre-line text-base-regular">
            {valogatas.intro}
          </p>
        ) : null}
      </div>
      {termekek.length ? (
        <ul
          className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
          data-testid="products-list"
        >
          {termekek.map((p, i) => (
            <li key={p.id}>
              <ProductPreview product={p} region={region} elso={i === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base-regular">
          Ebben a válogatásban most nincs termék.
        </p>
      )}
      {lap.lapok > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={lapSzam}
          totalPages={lap.lapok}
          cel={{
            alap: `/${params.countryCode}/valogatas/${params.handle}`,
            keres: lapozoKeres(keres),
          }}
        />
      )}
    </div>
  )
}
