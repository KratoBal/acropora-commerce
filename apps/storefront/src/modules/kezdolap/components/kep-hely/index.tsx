/**
 * EGY SZERKESZTHETO KEP, VAGY A SZURKE HELYE.
 *
 * Sima `img`, nem `next/image`: az optimalizalo csak a beallitott kep-hosztokat
 * szolgalja, es egy OS-bol jott, mas hosztu cim renderkor hibat dobna (ugyanaz
 * az indok, mint a hero-csuszkan). A `src` a `kepKereso`-bol jon, tehat csak
 * `http(s)` vagy bolti ut. A magassagot a hivo adja a `className`-mel.
 */
const KepHely = ({
  src,
  alt,
  className,
  testid,
}: {
  src: string | null
  alt: string
  className: string
  testid: string
}) =>
  src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      data-testid={testid}
      className={`${className} rounded object-cover`}
    />
  ) : (
    <div
      aria-hidden="true"
      data-testid={`${testid}-hely`}
      className={`${className} rounded`}
      style={{ background: "var(--kl-lap-halvany)" }}
    />
  )

export default KepHely
