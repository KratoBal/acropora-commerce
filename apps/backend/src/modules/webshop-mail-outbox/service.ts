import { MedusaService } from "@medusajs/framework/utils"

import WebshopMailOutbox from "./models/webshop-mail-outbox"

class WebshopMailOutboxModuleService extends MedusaService({ WebshopMailOutbox }) {}

export default WebshopMailOutboxModuleService
