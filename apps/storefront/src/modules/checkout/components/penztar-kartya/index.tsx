/** A fizetesi oldal kartyaja (Figma 209:3): feher lap, vekony keret, cim. */
export default function PenztarKartya({
  cim,
  children,
  "data-testid": testId,
}: {
  cim: string
  children: React.ReactNode
  "data-testid"?: string
}) {
  return (
    <section
      className="border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6"
      data-testid={testId}
    >
      <h2 className="mb-4 text-[22px] font-normal leading-[28px] text-acr-ink small:text-[26px] small:leading-[32px]">
        {cim}
      </h2>
      {children}
    </section>
  )
}
