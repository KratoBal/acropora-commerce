import { loadEnv, defineConfig } from "@medusajs/framework/utils"

import { COMMERCE_SETTINGS_MODULE } from "./src/modules/commerce-settings"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      connection: {
        ssl: false,
      },
    },
    redisUrl: process.env.REDIS_URL,
    workerMode:
      (process.env.MEDUSA_WORKER_MODE as
        | "shared"
        | "worker"
        | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },

  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },

  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      // Fulfillment providers are instantiated inside the fulfillment module's
      // isolated container. Medusa forwards only declared module dependencies
      // into that container, so this is required for the provider's dynamic
      // pricing settings service.
      dependencies: [COMMERCE_SETTINGS_MODULE],
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/acropora-fulfillment",
            id: "shipping",
          },
        ],
      },
    },
    {
      // The payment module runs with its defaults today, which registers only
      // the built-in system provider. Declaring it here adds ours; the system
      // provider is registered unconditionally by the module loader, so
      // `pp_system_default` does not disappear with this entry.
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/acropora-payment",
            id: "cod",
          },
        ],
      },
    },
    {
      resolve: "./src/modules/shipping-attributes",
    },
    {
      resolve: "./src/modules/commerce-settings",
    },
    {
      resolve: "./src/modules/order-business-status",
    },
    {
      resolve: "@medusajs/medusa/caching",
      options: {
        providers: [
          {
            resolve: "@medusajs/caching-redis",
            id: "caching-redis",
            is_default: true,
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: {
        redis: {
          redisUrl: process.env.REDIS_URL,
        },
      },
    },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/locking-redis",
            id: "locking-redis",
            is_default: true,
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
        ],
      },
    },
  ],
})
