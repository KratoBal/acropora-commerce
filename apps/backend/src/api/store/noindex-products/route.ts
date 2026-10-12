import { feedCache } from "../../../services/merchant-feed-cache"
import { noindexHandlesGet } from "./handles"

/** The noindex handles (t13), cached for five minutes (barracuda #550). */
const TTL_MS = 5 * 60 * 1000

export const GET = noindexHandlesGet(feedCache(TTL_MS))
