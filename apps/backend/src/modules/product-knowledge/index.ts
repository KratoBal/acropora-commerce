import { Module } from "@medusajs/framework/utils"

import ProductKnowledgeModuleService from "./service"

export const PRODUCT_KNOWLEDGE_MODULE = "product_knowledge"

export default Module(PRODUCT_KNOWLEDGE_MODULE, {
  service: ProductKnowledgeModuleService,
})
