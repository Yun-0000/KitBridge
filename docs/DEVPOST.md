# KitBridge

## Tagline

Turn mixed school-supply donations into complete kits and a focused restock list.

## Inspiration

A supply drive can have plenty of donations and still run short of complete school kits. One group needs crayons, another needs calculators, and both need notebooks. Counting the boxes does not tell a volunteer what they can actually pack.

KitBridge helps answer two questions: how many complete kits can we make now, and what should we buy next? It focuses on school supplies and SDG 4, especially equal access to education under target 4.5.

## What it does

Enter your inventory, the supplies needed for each kit, and the number of kits promised to each group. Add a restock budget and purchase-pack prices. KitBridge returns a packing plan and a shopping list.

The opening drive makes the decision easy to follow: the stock on hand covers **8 kits**. Buying one **$5 pack of notebooks** brings that to **12**. Change the budget or an item count and the plan changes with it.

The planner keeps your commitments. If you enter seven backpacks but have promised eight kits, it tells you what is missing instead of lowering the promise. Packing sheets separate supplies on hand from purchases that still need to arrive. You can print the sheets, export CSV lists, or save a JSON backup.

## How we built it

The interface uses React, TypeScript and Vite. HiGHS runs the calculations in a Web Worker so the editor stays responsive.

The model has two steps: maximize complete kits within the available stock, budget and commitments, then minimize the purchase cost for that kit total. Kit counts are integers and prices are stored in cents. Everything runs in the browser, and drives are saved on the device.

## Challenges we ran into

The cheapest item is not always the useful purchase. In the opening drive, a calculator costs $4, but notebooks are the bottleneck. A $5 notebook pack enables four more kits.

Another challenge was keeping the plan clear for the person packing. A list based on future purchases can be mistaken for a list ready to use. We separated those two views and included the supplies needed for each kit type.

## Accomplishments that we're proud of

The full workflow works in one place: count supplies, set commitments, compare the plan, and take a packing list to the table. Changes to the inputs invalidate the old result, so it cannot be exported as though it were current.

The tests cover planning, shortages, saved drives and exports. We also checked the solver against all possible allocations in 96 small cases.

## What we learned

A larger total is only part of the decision. Each group may already have been promised a minimum number of kits, and those promises need to be part of the calculation.

The result also needs to explain what to do next. A specific shortage or a short shopping list is more useful than a number alone.

## What's next

Try KitBridge with a volunteer packing team and their inventory. Check whether the purchase recommendations fit their buying process and whether the printed sheets are useful during packing.

## Built with

React, TypeScript, Vite, Tailwind CSS, Radix UI, HiGHS, WebAssembly, Web Workers.

## Try it out

https://kitbridge-sigma.vercel.app

## Source

https://github.com/Yun-0000/KitBridge

## Gallery

1. `screenshots/01-example-questions.png`
2. `screenshots/02-packing-plan.png`
3. `screenshots/03-before-after-shop.png`
