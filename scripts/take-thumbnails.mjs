// Renders each widget's embed page in headless Chrome and writes the homepage card
// thumbnails to src/assets/thumbnails/. Uses playwright-core to drive the Google Chrome on
// this machine; Framework does not bring it in, so `npm install --no-save playwright-core`
// first (it stays out of package.json).
//
// The PNGs it writes are committed. This is a manual tool, not part of the build: run
// `npm run build && npm run thumbnails` when a widget's appearance changes, then commit the
// updated images. It serves dist/, so the site must be built first, with the default base
// "/". Pages are requested by their built filename (embed.html).

import {createServer} from "node:http";
import {createReadStream, existsSync, renameSync, statSync, unlinkSync} from "node:fs";
import {mkdir} from "node:fs/promises";
import {extname, join, normalize, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright-core";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "src/assets/thumbnails");
const PORT = Number(process.env.THUMBNAIL_PORT ?? 8123);

// Captured square at the widgets' own 640 px cap, so the PNGs are already card-shaped and
// the homepage does not have to crop them. Rendered at 2x for sharp cards.
const SIZE = 640;
const SCALE = 2;

// `figure` is a selector the widget's own figure matches, so a page whose module failed to
// load does not match it. `query` is appended to the embed page's URL, for widgets whose
// opening frame is not their best one: the playground opens empty.
const WIDGETS = [
  {name: "complex-playground", query: "?z1=2,1&z2=1,1&show=z1*z2;roots(z1,5)&cartesian=1"},
].map(w => ({figure: `.${w.name}`, ...w}));

// A blank capture comes out near 7 kB, a real one far bigger; a last guard against
// overwriting a good image with an empty one.
const MIN_BYTES = 20000;

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2",
};

function serveDist() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    const file = join(DIST, path.endsWith("/") ? path + "index.html" : path);
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {"content-type": TYPES[extname(file)] ?? "application/octet-stream"});
    createReadStream(file).pipe(res);
  });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(PORT, "127.0.0.1", () => ok(server));
  });
}

async function shoot(page, {name, figure, query = ""}) {
  const url = `http://127.0.0.1:${PORT}/${name}/embed.html${query}`;
  try {
    await page.goto(url, {waitUntil: "load"});
    await page.waitForSelector(figure, {timeout: 30000});
  } catch {
    console.warn(`WARN: ${name} rendered no figure — keeping the existing thumbnail`);
    return;
  }
  await page.waitForLoadState("networkidle", {timeout: 15000}).catch(() => {});
  await page.waitForTimeout(300);

  // Shoot to a temporary file and only then replace the committed thumbnail, so a bad
  // capture costs a warning rather than a good image.
  const tmp = join(OUT, `.${name}.tmp.png`);
  await page.screenshot({path: tmp, clip: {x: 0, y: 0, width: SIZE, height: SIZE}});
  if (statSync(tmp).size < MIN_BYTES) {
    unlinkSync(tmp);
    console.warn(`WARN: ${name} captured blank — keeping the existing thumbnail`);
    return;
  }
  renameSync(tmp, join(OUT, `${name}.png`));
  console.log(`wrote src/assets/thumbnails/${name}.png`);
}

if (!existsSync(join(DIST, "index.html"))) {
  console.error("dist/ is not built — run npm run build first");
  process.exit(1);
}
await mkdir(OUT, {recursive: true});

const server = await serveDist();
// "chrome" is the Google Chrome installed on the machine; nothing is downloaded.
const browser = await chromium.launch({channel: "chrome", headless: true});
try {
  const context = await browser.newContext({viewport: {width: SIZE, height: SIZE}, deviceScaleFactor: SCALE});
  const page = await context.newPage();
  for (const widget of WIDGETS) await shoot(page, widget);
} finally {
  await browser.close();
  server.close();
}

let status = 0;
for (const {name} of WIDGETS) {
  if (!existsSync(join(OUT, `${name}.png`))) {
    console.error(`ERROR: src/assets/thumbnails/${name}.png does not exist and could not be generated`);
    status = 1;
  }
}
process.exit(status);
