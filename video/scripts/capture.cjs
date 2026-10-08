// Captures the app states and element positions the film uses.
// Usage: start the app (npm run dev in the repo root), then
//   node scripts/capture.cjs [http://localhost:5173/]
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:5173/';
const fs = require('fs');
const OUT = path.join(__dirname, '../public/shots/');
const boxes = {};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForSelector('.band-numbers strong'); await p.waitForTimeout(1500);
  const box = async (name, sel) => { const r = await p.locator(sel).first().boundingBox(); boxes[name] = r; };
  const shot = async (name) => { await p.mouse.move(0, 0); await p.screenshot({ path: OUT + name + '.png', fullPage: true }); const h = await p.evaluate(() => document.documentElement.scrollHeight); boxes['page:' + name] = { width: 1440, height: h }; };
  const settle = () => p.waitForTimeout(900);

  await shot('plan');
  for (const [n, s] of [['band', '.band'], ['numbers', '.band-numbers'], ['sentence', '.band-sentence'], ['mark', '.band-sentence mark'],
    ['kits', '.band-kits'], ['openPacking', 'button:has-text("Open packing sheets")'], ['sheet', '.sheet'], ['budget', '#budget'],
    ['notebookRow', '#item-name-item_notebook'], ['notebookTag', '.tag-dark'], ['buyChip', '.tag-accent'], ['backpack', '#item-stock-item_backpack'],
    ['kitHeads', '.kit-head'], ['restockGroup', '.restock-group']]) await box(n, s);

  // Budget: $10 -> $4 (no useful purchase)
  await p.locator('#budget').click(); await p.waitForTimeout(150);
  await shot('budget-focus');
  await p.keyboard.type('4'); await p.waitForTimeout(60); await shot('budget-typing');
  await settle(); await p.locator('#budget').blur(); await settle(); await shot('budget-4');
  await p.locator('#budget').fill('10'); await p.keyboard.press('Enter'); await settle();

  // Promise check: backpacks 12 -> 7
  await p.locator('#item-stock-item_backpack').click(); await p.waitForTimeout(150); await shot('backpack-focus');
  await p.keyboard.type('7'); await p.waitForTimeout(60); await shot('backpack-typing');
  await settle(); await p.locator('#item-stock-item_backpack').blur(); await settle(); await shot('backpack-7');
  await p.locator('#item-stock-item_backpack').fill('12'); await p.keyboard.press('Enter'); await settle();
  await shot('plan-back');

  // Packing
  await p.getByRole('button', { name: /Open packing sheets/ }).click(); await p.waitForTimeout(400);
  await shot('pack-now');
  await box('afterTab', '[role="tab"]:has-text("After restock")');
  await p.getByRole('tab', { name: /After restock/ }).click(); await p.waitForTimeout(400);
  await shot('pack-after');
  await box('buyFirst', '.buy-first'); await box('packGrid', '.pack-grid'); await box('printBtn', 'button:has-text("Print sheets")');
  const checks = p.locator('.pack-card').first().locator('input[type=checkbox]');
  for (let i = 0; i < 3; i++) { await checks.nth(i).check(); await shot('pack-check-' + (i + 1)); }
  await box('firstCard', '.pack-card');
  const cbs = p.locator('.pack-card').first().locator('input[type=checkbox]');
  for (let i = 0; i < 3; i++) boxes['check' + (i + 1)] = await cbs.nth(i).boundingBox();
  await p.emulateMedia({ media: 'print' }); await p.screenshot({ path: OUT + 'print.png', fullPage: true }); await p.emulateMedia({ media: 'screen' });

  // Phone
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
  await m.goto(BASE); await m.evaluate(() => localStorage.clear()); await m.reload();
  await m.waitForSelector('.band-numbers strong'); await m.waitForTimeout(1500);
  await m.screenshot({ path: OUT + 'phone-plan.png', fullPage: true });
  await m.getByRole('tab', { name: 'Restock' }).click(); await m.waitForTimeout(300);
  await m.screenshot({ path: OUT + 'phone-restock.png', fullPage: true });
  boxes['phoneSheet'] = await m.locator('.sheet').boundingBox();
  fs.writeFileSync(path.join(__dirname, '../src/boxes.json'), JSON.stringify(boxes, null, 1));
  await b.close();
  console.log(Object.keys(boxes).length, 'boxes');
})();
