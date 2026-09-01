import { MedusaService } from "@medusajs/framework/utils";

import CommerceSetting from "./models/commerce-setting";
import ShippingPaymentRule from "./models/shipping-payment-rule";

class CommerceSettingsModuleService extends MedusaService({
  CommerceSetting,
  ShippingPaymentRule,
}) {}

export default CommerceSettingsModuleService;
