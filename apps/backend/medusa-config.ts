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
      /**
       * THE PUBLIC ADDRESS OF UPLOADED IMAGES COMES FROM THE ENVIRONMENT.
       *
       * Without this entry the default file module runs with the local
       * provider's own fallback, `http://localhost:9000/static` (measured in
       * @medusajs/file-local, `services/local-file.js`). That address resolves
       * on the server and nowhere else, so the STOREFRONT shows a broken image
       * while every one of our own screens looks fine.
       *
       * DECLARING IT REPLACES THE DEFAULT, IT DOES NOT ADD TO IT. `transformModules`
       * keys by service name and the last entry with the same key wins, and the
       * file module's provider loader registers ONLY `options.providers` - it has
       * no unconditional system provider. That is the difference from the payment
       * module above, whose loader registers the system provider first, which is
       * why that comment says the opposite. The two loaders really do behave
       * differently; the difference is in their source, not in the documentation.
       *
       * NO DEFAULT ON THE VALUE, and that is the point of the whole entry: a
       * fallback here would be the very fault being fixed. The deploy refuses to
       * start without it - see `src/scripts/verify-file-backend-url.ts`, run from
       * the entrypoint. It is checked THERE and not thrown from here because this
       * file is loaded by `medusa build` too, and a throw would break the image
       * build in every environment, including ones that never serve a customer.
       *
       * THE VALUE CARRIES THE PATH, not just the host: the provider appends the
       * file key to the configured pathname.
       */
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              backend_url: process.env.MEDUSA_FILE_BACKEND_URL,
            },
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
