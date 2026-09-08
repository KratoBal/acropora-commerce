"use client"

/**
 * A GYOKER-HATAR: akkor sul el, ha maga a gyoker-elrendezes hasal el.
 *
 * MIERT KULON FAJL, ES MIERT VISZ SAJAT `html`/`body` ELEMET: ilyenkor a
 * gyoker-elrendezes NEM all rendelkezesre, tehat ennek a lapnak magaval kell
 * hoznia a dokumentum-vazat. Ez a Next.js sajat alakja, nem a mi dontesunk.
 *
 * ES AMIERT NEM HASZNAL KOZOS KOMPONENST: a `(main)/error.tsx` az elrendezesen
 * BELUL all, tehat ott a fejlec, a lablec es a stiluslap mind el. Itt egyik
 * sem biztos -- egy megosztott komponens epp azon a lapon dolne el, aminek a
 * legkevesebbre szabad tamaszkodnia.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="hu">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Hiba történt</h1>
          <p>Az oldal betöltése közben hiba történt.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              textDecoration: "underline",
              textUnderlineOffset: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Próbáld újra
          </button>
          <a href="/">Vissza a főoldalra</a>
        </div>
      </body>
    </html>
  )
}
