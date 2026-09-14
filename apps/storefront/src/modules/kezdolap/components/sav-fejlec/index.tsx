import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * EGY SAV FEJLECE A KEZDOLAPON.
 *
 * A terven mind az ot sav ugyanazt az alakot viseli: apro, nagybetus eyebrow
 * felul, alatta a cim, a sor jobb szelen pedig egy tovabbvivo hivatkozas. Egy
 * helyen all, mert ha savonkent masolnank, az elso atrendezes utan mar nem
 * ugyanaz az alak ot helyen.
 *
 * A `jobbra` NEM kotelezo: a Reef Club savnak a terven sincs tovabbvivo
 * hivatkozasa, mert maga a sav a cselekves.
 */
const SavFejlec = ({
  eyebrow,
  cim,
  jobbraSzoveg,
  jobbraCim,
  jelzo,
}: {
  eyebrow: string
  cim: string
  jobbraSzoveg?: string
  jobbraCim?: string
  jelzo?: React.ReactNode
}) => {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--terv-kiemel-tinta)" }}
        >
          {eyebrow}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2
            className="text-2xl font-semibold"
            style={{ color: "var(--terv-szoveg)" }}
          >
            {cim}
          </h2>
          {jelzo}
        </div>
      </div>
      {jobbraSzoveg && jobbraCim ? (
        <LocalizedClientLink
          href={jobbraCim}
          className="text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: "var(--terv-kiemel-tinta)" }}
        >
          {jobbraSzoveg}
        </LocalizedClientLink>
      ) : null}
    </div>
  )
}

export default SavFejlec
