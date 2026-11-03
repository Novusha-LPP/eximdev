// usage: node pw.mjs '<json>'  json: {w,h,path,out,steps:[...],view:'full'|'shrink',logs:true}
import { chromium } from "/home/aiserver/eximdev/server/node_modules/playwright/index.mjs";
const cfg = JSON.parse(process.argv[2]);
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: cfg.w || 1700, height: cfg.h || 1000 } });
await ctx.addInitScript(({ view }) => {
  localStorage.setItem("token", "mock-token");
  localStorage.setItem("exim_user", JSON.stringify({ username: "demo.admin", name: "Demo Admin", role: "Admin", email: "demo@example.com", modules: ["Import - DSR", "Import - DO", "Import - Operations"], profileCompletion: { percentage: 100 }, assigned_importer_name: ["ALL"], isActive: true }));
  localStorage.setItem("exim_joblist_view_mode", view || "full");
}, { view: cfg.view });
const page = await ctx.newPage();
const logs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(m.type() + ": " + m.text().slice(0, 300)); });
page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 400)));
await page.goto("http://localhost:3110" + (cfg.path || "/import-dsr"), { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
for (const s of cfg.steps || []) {
  try {
    if (s.click) await page.click(s.click, { timeout: 4000 });
    if (s.eval) { const r = await page.evaluate(s.eval); if (r !== undefined && cfg.printEval) console.log("EVAL:", JSON.stringify(r)); }
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.scroll !== undefined) await page.evaluate((y) => { const c = document.querySelector(".MuiTableContainer-root"); if (c) c.scrollTop = y; }, s.scroll);
    if (s.hover) await page.hover(s.hover);
    if (s.type) await page.fill(s.type[0], s.type[1]);
    if (s.shot) await page.screenshot({ path: s.shot, fullPage: !!s.full });
  } catch (e) { logs.push("STEPERR " + JSON.stringify(s).slice(0, 80) + " " + String(e).slice(0, 160)); }
}
if (cfg.out) await page.screenshot({ path: cfg.out, fullPage: !!cfg.full });
if (cfg.logs !== false) console.log(logs.slice(0, 25).join("\n"));
await browser.close();
