import { EllipseMiniSolid } from "@medusajs/icons"
import { Label, RadioGroup, Text, clx } from "@modules/common/components/ui"
type FilterRadioGroupProps = {
  title: string
  items: {
    value: string
    label: string
  }[]
  value: string
  handleChange: (value: string) => void
  "data-testid"?: string
}

/** A csoport neve a cimbol: azonos nevu radiok EGY csoportot alkotnak (nyilbillentyu). */
export const csoportNev = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "szuro"

/**
 * A RENDEZES BILLENTYUZETTEL ELERHETO (commerce-audit-p1, P1/7, H2): a radiok
 * `hidden` osztalyt viseltek (`display: none`), nev nelkul, es a csoportnak nem
 * volt hozzaferheto neve. A `display: none` elem nem kap fokuszt, tehat a
 * rendezes billentyuzettel es felolvasoval hasznalhatatlan volt (WCAG 2.1.1,
 * 1.3.1).
 *
 * Most: a radio `sr-only` (lathatatlan, de fokuszalhato), azonos `name`-mel (egy
 * csoport, a nyilak lepnek), a csoport `radiogroup` szereppel es a cimmel mint
 * hozzaferheto nevvel (`aria-labelledby`), es a fokuszalt sor lathato keretet kap
 * (`focus-within`, WCAG 2.4.7). A kinezet mouse-nal valtozatlan.
 */
const FilterRadioGroup = ({
  title,
  items,
  value,
  handleChange,
  "data-testid": dataTestId,
}: FilterRadioGroupProps) => {
  const nev = csoportNev(title)
  const cimId = `${nev}-cim`
  return (
    <div className="flex gap-x-3 flex-col gap-y-3">
      <Text id={cimId} className="txt-compact-small-plus text-ui-fg-muted">
        {title}
      </Text>
      <RadioGroup
        data-testid={dataTestId}
        role="radiogroup"
        aria-labelledby={cimId}
      >
        {items?.map((i) => (
          <div
            key={i.value}
            className={clx(
              "flex gap-x-2 items-center focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ui-fg-base",
              {
                "ml-[-23px]": i.value === value,
              },
            )}
          >
            {i.value === value && <EllipseMiniSolid />}
            <RadioGroup.Item
              checked={i.value === value}
              onChange={() => handleChange(i.value)}
              className="sr-only peer"
              id={i.value}
              name={nev}
              value={i.value}
            />
            <Label
              htmlFor={i.value}
              className={clx(
                "!txt-compact-small !transform-none text-ui-fg-subtle hover:cursor-pointer",
                {
                  "text-ui-fg-base": i.value === value,
                },
              )}
              data-testid="radio-label"
              data-active={i.value === value}
            >
              {i.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

export default FilterRadioGroup
