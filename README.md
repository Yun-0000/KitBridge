<h1 align="center">
  <img src="public/favicon.svg" width="44" alt="" /><br />
  KitBridge
</h1>

<p align="center"><strong>Turn mixed donations into complete school-supply kits.</strong><br />
Know how many kits you can pack right now, and what to buy next.</p>

<p align="center">
  <a href="https://kitbridge-sigma.vercel.app"><img src="https://img.shields.io/badge/Open_planner-FFC93C?style=for-the-badge&logoColor=141414&labelColor=FFC93C&color=FFC93C" alt="Open planner" /></a>
  <a href="https://kitbridge-sigma.vercel.app/demo/"><img src="https://img.shields.io/badge/%E2%96%B6_Watch_the_demo-1%3A55-141414?style=for-the-badge&labelColor=141414&color=2C2B28" alt="Watch the 1:55 demo" /></a>
</p>

<p align="center">
  <a href="https://github.com/Yun-0000/KitBridge/actions/workflows/ci.yml"><img src="https://github.com/Yun-0000/KitBridge/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-141414" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/runs_in-your_browser-FFC93C" alt="Runs in your browser" />
  <img src="https://img.shields.io/badge/UN_SDG-4.5-141414" alt="UN SDG 4.5" />
</p>

<p align="center">
  <a href="https://kitbridge-sigma.vercel.app/demo/">
    <img src="public/demo/poster.jpg" alt="KitBridge demo film: 8 kits from stock, 12 after a $5 notebook pack" width="860" />
  </a>
  <br />
  <sub>▶ <a href="https://kitbridge-sigma.vercel.app/demo/">Watch the narrated demo</a> (1:55, captions on screen)</sub>
</p>

## The problem

A school supply drive can have plenty of donations and still run short of complete kits. One group needs crayons, another needs calculators, both need notebooks, and some kits were promised weeks ago. Counting by hand, it is hard to see what to pack, and which purchase actually finishes more kits.

## What KitBridge does

| 1 · Count | 2 · Plan | 3 · Pack |
| :--- | :--- | :--- |
| One drive sheet for stock on hand, the recipe for each kit and restock prices. | See kits now and after restock, what runs out first, and the one purchase that helps most. | Print a checklist for each kit type, or export CSV. |

The example drive packs **8 kits** from stock. One **$5 notebook pack** brings that to **12 of 16**. Change any number and the plan updates as you type.

<table>
  <tr>
    <td width="50%" valign="top"><img src="docs/screenshots/01-example-questions.png" alt="Plan: 8 kits now, 12 after restock, with the drive sheet below" /><br /><sub><b>The answer on top.</b> Kits now and after restock, and why.</sub></td>
    <td width="50%" valign="top"><img src="docs/screenshots/02-packing-plan.png" alt="Packing checklists with a Buy first card" /><br /><sub><b>Packing sheets.</b> Exact totals for each kit, ready to print.</sub></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/04-infeasible-backpacks.png" alt="Shortage: 8 promised kits need 8 backpacks, only 7 on hand" /><br /><sub><b>Promises are hard limits.</b> KitBridge names the shortage instead of breaking a promise.</sub></td>
    <td valign="top"><img src="docs/screenshots/05-mobile.png" alt="KitBridge on a phone" /><br /><sub><b>Works on a phone.</b> Count right in the stockroom.</sub></td>
  </tr>
</table>

## Made for supply drives

- **See the bottleneck.** The plan names the supply that runs out first and what the next kit still needs.
- **Keep commitments.** Set a minimum for each group and see shortages when stock falls short.
- **Spend only where it helps.** If a purchase does not finish another kit, KitBridge spends nothing.
- **Keep your data.** Drives save on your device. JSON backups let you move them. Nothing is sent to a server.

Supports 3 kit types, 12 items, 100 requested kits and a $1,000 restock budget.

## How it works

```mermaid
flowchart LR
  A["Stock · recipes<br/>promises · budget"] --> B["Step 1<br/>Maximize complete kits"]
  B --> C["Step 2<br/>Cheapest purchase<br/>for that total"]
  C --> D["Packing sheets<br/>+ shopping list"]
```

KitBridge solves a two-step integer program with the [HiGHS](https://highs.dev) solver, compiled to WebAssembly and running in a Web Worker. Money is counted in whole cents. The tests check the solver against brute-force enumeration on 96 small drives.

Built with React, TypeScript and Vite.

## Run locally

Requires **Node.js 22**.

```sh
npm ci
npm run dev
```

| Command | Purpose |
| :--- | :--- |
| `npm test` | Check planning, shortages, exports and saved drives. |
| `npm run build` | Create the production build. |
| `npm run preview` | Preview that build locally. |

The demo film is made with [Remotion](https://www.remotion.dev) from screenshots of the real app. See [`video/`](video/README.md).

## License

[MIT](LICENSE). [Font license](public/fonts/LICENSE).
