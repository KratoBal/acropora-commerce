import UrlRedirectModuleService from "../../../../modules/url-redirect/service";
import { GET as storeGet } from "../../../store/redirects/route";
import { redirectsHash, sortRedirects } from "../helpers";
import { GET as adminGet, PUT as adminPut } from "../route";
import { AdminPutUrlRedirects } from "../validators";

/*
  THE SHOP'S REDIRECT LIST (SEO P0 PR 7a). What turns these red: a chain, a
  case-only duplicate source, a self-redirect, a query or a relative path let
  through; the fingerprint depending on the order the rows arrive in; the
  replace not deleting the old rows, or leaving the transaction; the store
  route not giving the lowercase lookup key.
*/
const r = (source_path: string, destination_path: string) => ({
  source_path,
  destination_path,
  status: 301 as const,
});

describe("AdminPutUrlRedirects", () => {
  const ok = (redirects: unknown[]) =>
    AdminPutUrlRedirects.safeParse({ redirects }).success;

  it("takes the backfill's shapes: capitals, a slash in the SefUrl, /spd/", () => {
    expect(
      ok([
        r("/Tropic-Pro-Reef", "/hu/termek/tp"),
        r("/Pumpa-3000-liter/ora", "/hu/termek/p"),
        r("/spd/156161/Nyos-Reef-Putty-200g", "/hu/termek/nyos"),
      ]),
    ).toBe(true);
    expect(ok([])).toBe(true);
  });

  it("refuses a chain, a case-only duplicate and a self-redirect", () => {
    expect(ok([r("/a", "/b"), r("/B", "/c")])).toBe(false);
    expect(ok([r("/Pumpa", "/x"), r("/pumpa", "/y")])).toBe(false);
    expect(ok([r("/a", "/A")])).toBe(false);
  });

  it("refuses a relative path, a query, a space and another status", () => {
    expect(ok([r("Pumpa", "/x")])).toBe(false);
    expect(ok([r("/Pumpa?x=1", "/x")])).toBe(false);
    expect(ok([r("/a b", "/x")])).toBe(false);
    expect(ok([{ ...r("/a", "/x"), status: 302 }])).toBe(false);
    expect(ok([{ ...r("/a", "/x"), extra: 1 }])).toBe(false);
  });

  it("refuses a destination a browser takes as another domain (open redirect)", () => {
    for (const cel of [
      "//idegen.hu/x",
      "/\\idegen.hu/x",
      "/hu\\termek",
      "https://idegen.hu/x",
    ])
      expect(ok([r("/a", cel)])).toBe(false);
  });
});

describe("the fingerprint", () => {
  it("the test vector shared with the OS (medusa-redirect-projection.spec.ts)", () => {
    expect(
      redirectsHash([
        r("/b", "/hu/termek/b"),
        r("/Pumpa", "/hu/termek/p"),
        r("/spd/1/Á", "/hu/termek/a"),
      ]),
    ).toBe("e940fd01f827505f2388bbb2c28fbaeaf5bc86d8c9f27de68b265b1df7217832");
  });

  it("does not depend on the order the rows arrive in", () => {
    const egyik = [r("/b", "/x"), r("/A", "/y")];
    expect(redirectsHash(egyik)).toBe(redirectsHash([...egyik].reverse()));
    expect(sortRedirects(egyik).map((x) => x.source_path)).toEqual([
      "/A",
      "/b",
    ]);
  });

  it("changes with any field", () => {
    const alap = redirectsHash([r("/a", "/x")]);
    expect(redirectsHash([r("/a", "/y")])).not.toBe(alap);
    expect(redirectsHash([r("/A", "/x")])).not.toBe(alap);
    expect(redirectsHash([])).not.toBe(alap);
  });
});

describe("replaceUrlRedirects", () => {
  const fake = (existing: string[]) => {
    const calls: string[] = [];
    const trx = { name: "trx" };
    const seen = (what: string, context: { transactionManager?: unknown }) =>
      calls.push(
        `${what}${context?.transactionManager === trx ? "" : " OUTSIDE"}`,
      );
    const self = {
      baseRepository_: {
        getFreshManager: () => ({ name: "manager" }),
        transaction: async (fn: (t: unknown) => Promise<unknown>) => {
          calls.push("begin");
          const result = await fn(trx);
          calls.push("commit");
          return result;
        },
      },
      listUrlRedirects: async (_: unknown, __: unknown, c: never) => {
        seen("list", c);
        return existing.map((id) => ({ id }));
      },
      deleteUrlRedirects: async (ids: string[], c: never) =>
        seen(`delete ${ids.join(",")}`, c),
      createUrlRedirects: async (
        rows: { source_path: string; source_path_lower: string }[],
        c: never,
      ) =>
        seen(
          `create ${rows.map((x) => `${x.source_path}|${x.source_path_lower}`).join(",")}`,
          c,
        ),
    };
    Object.assign(self, {
      replaceUrlRedirects_: (
        UrlRedirectModuleService.prototype as unknown as {
          replaceUrlRedirects_: unknown;
        }
      ).replaceUrlRedirects_,
    });
    const replace = (
      input: Parameters<UrlRedirectModuleService["replaceUrlRedirects"]>[0],
    ) =>
      UrlRedirectModuleService.prototype.replaceUrlRedirects.call(
        self as never,
        input,
      );
    return { calls, replace };
  };

  it("deletes every old row, then writes the new ones with the lowercase key, in one transaction", async () => {
    const { calls, replace } = fake(["u1", "u2"]);
    await replace([r("/Pumpa", "/hu/termek/p")]);
    expect(calls).toEqual([
      "begin",
      "list",
      "delete u1,u2",
      "create /Pumpa|/pumpa",
      "commit",
    ]);
  });

  it("an empty list clears the table and writes nothing", async () => {
    const { calls, replace } = fake(["u1"]);
    await replace([]);
    expect(calls).toEqual(["begin", "list", "delete u1", "commit"]);
  });
});

describe("the routes", () => {
  const stored = [r("/b", "/hu/termek/b"), r("/Pumpa", "/hu/termek/p")];
  const scope = () => {
    const replaced: unknown[] = [];
    const service = {
      listUrlRedirects: async () => stored,
      replaceUrlRedirects: async (rows: unknown) => {
        replaced.push(rows);
      },
    };
    return {
      replaced,
      scope: {
        resolve: (key: string) =>
          key === "logger" ? { info: () => {}, warn: () => {} } : service,
      },
    };
  };
  const call = async (
    handler: (req: never, res: never) => Promise<void>,
    scopeOf: unknown,
    validatedBody?: unknown,
  ) => {
    let body: unknown;
    await handler(
      { scope: scopeOf, validatedBody } as never,
      { json: (b: unknown) => (body = b) } as never,
    );
    return body as Record<string, unknown>;
  };

  it("admin GET: the sorted list, its count and fingerprint", async () => {
    const { url_redirects } = (await call(adminGet, scope().scope)) as {
      url_redirects: { count: number; hash: string; redirects: unknown[] };
    };
    expect(url_redirects.count).toBe(2);
    expect(url_redirects.hash).toBe(redirectsHash(stored));
    expect(url_redirects.redirects).toEqual([stored[0], stored[1]]);
  });

  it("admin PUT: replaces with the validated list", async () => {
    const s = scope();
    await call(adminPut, s.scope, { redirects: [r("/x", "/y")] });
    expect(s.replaced).toEqual([[r("/x", "/y")]]);
  });

  it("store GET: rows of [lowercase source, destination, status]", async () => {
    const answer = await call(storeGet, scope().scope);
    expect(answer.redirects).toEqual([
      ["/b", "/hu/termek/b", 301],
      ["/pumpa", "/hu/termek/p", 301],
    ]);
    expect(answer.hash).toBe(redirectsHash(stored));
  });
});
