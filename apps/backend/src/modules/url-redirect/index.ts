import { Module } from "@medusajs/framework/utils";

import UrlRedirectModuleService from "./service";

export const URL_REDIRECT_MODULE = "url_redirect";

export default Module(URL_REDIRECT_MODULE, {
  service: UrlRedirectModuleService,
});
