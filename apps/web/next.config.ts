import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Le monorepo centralise la configuration dans un `.env` unique à la racine
// (voir `.env.example`), chargé ici puisque Next.js ne lit que `apps/web/.env*`.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(currentDir, "../../.env");
if (existsSync(rootEnvPath)) {
  loadEnv({ path: rootEnvPath });
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@zugchess/core"],
  webpack(config) {
    // `packages/core` importe ses modules internes avec l'extension `.js`
    // (convention ESM/NodeNext) alors que les fichiers sont des `.ts` : on
    // indique à webpack de résoudre `.js` vers `.ts`/`.tsx` pour ce paquet transpilé.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
