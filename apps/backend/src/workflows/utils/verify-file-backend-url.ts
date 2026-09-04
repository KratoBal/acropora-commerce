/**
 * IS THE PUBLIC IMAGE PREFIX CONFIGURED, AND CONFIGURED USABLY?
 *
 * === WHY THIS EXISTS: THE SHOP SERVES BROKEN IMAGES AND SAYS NOTHING ===
 *
 * The local file provider builds every public image address from one value:
 *
 *   const baseUrl = new URL(this.backendUrl_);
 *   baseUrl.pathname = path.join(baseUrl.pathname, fileKey);
 *
 * and when nothing is configured it falls back to `http://localhost:9000/static`
 * (measured in @medusajs/file-local, `services/local-file.js`). That address
 * resolves on the server and nowhere else, so the STOREFRONT shows a broken
 * image while every one of our own screens looks fine.
 *
 * Nothing fails, nothing is logged, and the only person who finds out is the
 * customer. That silence is the problem, not the missing variable.
 *
 * === WHY IT REFUSES TO START RATHER THAN FALLING BACK ===
 *
 * A default here would be the very fault we are fixing: the deploy would come
 * up, look healthy, and serve localhost addresses to customers. Refusing is
 * LOUD - somebody says "the shop will not start" within a minute - and the
 * fallback is silent for as long as nobody opens the storefront.
 *
 * The price of refusing is a stopped boot, and that price is only fair if the
 * message says what to fix. Each refusal below names the variable and the shape
 * the value must have.
 *
 * === WHY THE PATH MATTERS, AND NOT ONLY THE HOST ===
 *
 * The provider appends the file key to the configured PATHNAME, and it writes
 * the files into `<cwd>/static`, which is what the server exposes under
 * `/static`. So the value is not the site root: it must carry that path.
 * Measured on a file already uploaded to staging:
 *
 *   https://commerce-stage.acropora.hu/static/1788516704783-156161  ->  HTTP 200
 *
 * A value without it produces addresses that are wrong for every image, and
 * wrong in a way that looks like a typo in one product.
 */

/** The path the server exposes the uploaded files under. */
const PUBLIC_FILE_PATH = "/static";

export type FileBackendUrlProblem = "missing" | "malformed" | "wrong-path";

export type FileBackendUrlCheck =
  | { ok: true; value: string }
  | { ok: false; problem: FileBackendUrlProblem; message: string };

/**
 * Checks the configured value, without touching the environment itself: the
 * caller reads it, so this stays a pure function and can be measured.
 */
export function verifyFileBackendUrl(raw: string | undefined): FileBackendUrlCheck {
  const value = (raw ?? "").trim();

  if (!value)
    return {
      ok: false,
      problem: "missing",
      message: describeFileBackendUrlProblem("missing"),
    };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    /**
     * A value the provider cannot parse would throw on the FIRST upload, deep
     * inside the module and long after the deploy looked successful. Catching
     * it here moves the same failure to the boot, where it is attributable.
     */
    return {
      ok: false,
      problem: "malformed",
      message: describeFileBackendUrlProblem("malformed"),
    };
  }

  /**
   * A TRAILING SLASH IS NOT AN ERROR: `path.join` swallows it, so
   * `.../static` and `.../static/` produce identical addresses. Refusing it
   * would be a rule about typing, not about behaviour.
   */
  const pathname = parsed.pathname.replace(/\/+$/, "");
  if (!pathname.endsWith(PUBLIC_FILE_PATH))
    return {
      ok: false,
      problem: "wrong-path",
      message: describeFileBackendUrlProblem("wrong-path"),
    };

  return { ok: true, value };
}

/**
 * THE THREE REFUSALS GET THREE SENTENCES, because the remedy differs: one is a
 * missing variable, one is a mistyped value, and one is a value that looks
 * right and points at the wrong place.
 */
export function describeFileBackendUrlProblem(
  problem: FileBackendUrlProblem,
): string {
  if (problem === "missing")
    return (
      "A MEDUSA_FILE_BACKEND_URL nincs beállítva, ezért a bolt a képek belső, " +
      "localhost címét adná ki a vevőnek. A bolt szándékosan nem indul el: " +
      "állítsd be a nyilvános címet, a /static útvonallal együtt " +
      "(például https://commerce-stage.acropora.hu/static)."
    );
  if (problem === "malformed")
    return (
      "A MEDUSA_FILE_BACKEND_URL értéke nem értelmezhető címként. Teljes cím " +
      "kell, protokollal együtt (például https://commerce-stage.acropora.hu/static)."
    );
  return (
    "A MEDUSA_FILE_BACKEND_URL értéke nem a /static útvonalra mutat. A képek " +
    "fájlneve ehhez az útvonalhoz fűződik hozzá, tehát a site gyökere hibás " +
    "címeket adna MINDEN képre. Ha a fájlokat valaha máshonnan szolgáljuk ki, " +
    "ez az ellenőrzés az a hely, ahol változtatni kell."
  );
}
