/**
 * Prend des captures d'écran avant refonte — mobile (390×844) et desktop (1440×900).
 * Utilise Chrome installé localement via Puppeteer.
 * Usage : node scripts/screenshots.mjs [--base http://localhost:3000]
 */
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/screenshots/avant");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3000";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 3 },
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 },
];

// Pages publiques (pas d'auth requise)
const PAGES = [
  { slug: "accueil", path: "/fr" },
  { slug: "onboarding-try", path: "/fr/try" },
  { slug: "login", path: "/fr/login" },
];

async function shoot(page, name, vp) {
  const file = path.join(OUT, `${vp.name}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ ${vp.name}-${name}.png`);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const vp of VIEWPORTS) {
    console.log(`\n── ${vp.name} (${vp.width}×${vp.height}) ──`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor });

    for (const { slug, path: pagePath } of PAGES) {
      try {
        await page.goto(`${BASE}${pagePath}`, { waitUntil: "networkidle2", timeout: 15000 });
        await new Promise((r) => setTimeout(r, 800)); // animations
        await shoot(page, slug, vp);
      } catch (e) {
        console.error(`  ✗ ${slug}: ${e.message}`);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nCaptures dans docs/screenshots/avant/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
