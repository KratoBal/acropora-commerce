import { Context } from "@medusajs/framework/types";
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils";

import UrlRedirect from "./models/url-redirect";

export type UrlRedirectInput = {
  source_path: string;
  destination_path: string;
  status: number;
};

class UrlRedirectModuleService extends MedusaService({ UrlRedirect }) {
  /**
   * FULL REPLACE of the whole list, in one transaction: the OS sends every active
   * rule, so a rule it no longer sends must disappear, and an empty list clears
   * the table. Rows are deleted, not soft-deleted: this is a projection, the
   * history lives in the OS.
   */
  @InjectManager()
  async replaceUrlRedirects(
    input: UrlRedirectInput[],
    @MedusaContext() sharedContext: Context = {},
  ) {
    await this.replaceUrlRedirects_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async replaceUrlRedirects_(
    input: UrlRedirectInput[],
    @MedusaContext() sharedContext: Context = {},
  ) {
    // `take: null`: a Medusa lista alapból csak egy lapot ad, és akkor a régi sorok
    // egy része bent maradna, a második csere pedig az egyedi indexen elhasalna
    // (barracuda, #533 1.)
    const meglevo = await this.listUrlRedirects(
      {},
      { select: ["id"], take: null },
      sharedContext,
    );
    if (meglevo.length)
      await this.deleteUrlRedirects(
        meglevo.map((r) => r.id),
        sharedContext,
      );
    if (input.length)
      await this.createUrlRedirects(
        input.map((r) => ({
          ...r,
          source_path_lower: r.source_path.toLowerCase(),
        })),
        sharedContext,
      );
  }
}

export default UrlRedirectModuleService;
