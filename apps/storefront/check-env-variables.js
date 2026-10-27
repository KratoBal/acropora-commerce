const c = require("ansi-colors");
const { baseUrlHiba } = require("./base-url-ellenorzes");

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    // TODO: we need a good doc to point this to
    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
];

/**
 * A KIRAKAT CIME (commerce-audit-p0, S1): production uzemben, epiteskor es
 * inditaskor is. Az indoklas es a hatar: `base-url-ellenorzes.js`.
 */
function checkBaseUrl() {
  if (process.env.NODE_ENV !== "production") return;

  const hiba = baseUrlHiba(process.env.NEXT_PUBLIC_BASE_URL);
  if (!hiba) return;

  console.error(
    c.red.bold("\n🚫 Error: NEXT_PUBLIC_BASE_URL is not usable for a production build\n")
  );
  console.error(c.yellow(`  ${c.bold("NEXT_PUBLIC_BASE_URL")}: ${hiba}\n`));
  console.error(
    c.yellow(
      "A canonical címek, az og:url és a strukturált adatok erre épülnek; rossz érték mellett a keresők nem a bolt lapjait indexelik.\n"
    )
  );
  process.exit(1);
}

function checkEnvVariables() {
  checkBaseUrl();

  const missingEnvs = requiredEnvs.filter(function (env) {
    c;
    return !process.env[env.key];
  });

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    );

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`));
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`));
      }
    });

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    );

    process.exit(1);
  }
}

module.exports = checkEnvVariables;
