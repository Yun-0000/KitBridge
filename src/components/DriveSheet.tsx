import { useState, type CSSProperties } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { PlusIcon, XmarkIcon } from "./icons";
import { IntField, MoneyField } from "./Fields";
import { CAPS } from "../constants";
import { formatUsd } from "../model/money";
import {
  addItem,
  addKit,
  removeItem,
  removeKit,
  setRecipeQty,
  updateItem,
  updateKit,
} from "../model/scenario";
import type { Purchase } from "../model/insights";
import type { ItemId, Scenario } from "../types";

type SheetProps = {
  scenario: Scenario;
  /** Items that block another kit in the current plan. */
  limiting: Set<ItemId>;
  /** Suggested purchases from the restock plan, by item. */
  buys: Map<ItemId, Purchase>;
  onEdit: (next: Scenario) => void;
};

/*
 * One sheet for the whole drive: a row per supply, with stock, the recipe of
 * every kit type and restock prices side by side. On a phone the sheet shows
 * one column group at a time, picked with the switcher above it.
 */
export function DriveSheet({ scenario, limiting, buys, onEdit }: SheetProps) {
  const { items, kits } = scenario;
  const [focus, setFocus] = useState("stock");
  const active = focus === "stock" || focus === "restock" || kits.some((k) => k.id === focus)
    ? focus
    : "stock";
  const kitLabel = (index: number) => kits[index].name || `Kit ${index + 1}`;
  const itemLabel = (index: number) => items[index].name || `Item ${index + 1}`;
  const on = (group: string) => (group === active ? " is-active" : "");
  const style = {
    "--kits": kits.length,
    "--narrow":
      active === "restock"
        ? "minmax(0, 1fr) 64px 92px"
        : active === "stock"
          ? "minmax(0, 1fr) 84px 44px"
          : "minmax(0, 1fr) 84px",
  } as CSSProperties;

  return (
    <section className="sheet" aria-labelledby="sheet-h">
      <div className="sheet-top">
        <div>
          <h2 id="sheet-h">Drive sheet</h2>
          <p className="hint">
            Count single items. Kit columns are the recipe; restock columns are your
            price estimates.
          </p>
        </div>
        <MoneyField
          id="budget"
          label="Restock budget"
          className="budget"
          cents={scenario.budgetCents}
          maxCents={CAPS.maxBudgetCents}
          onChange={(budgetCents) => onEdit({ ...scenario, budgetCents, label: null })}
        />
      </div>

      <Tabs value={active} onValueChange={setFocus} className="sheet-switch">
        <TabsList aria-label="Column to edit">
          <TabsTrigger value="stock">Stock</TabsTrigger>
          {kits.map((kit, index) => (
            <TabsTrigger key={kit.id} value={kit.id} title={kitLabel(index)}>
              <span>{kitLabel(index)}</span>
            </TabsTrigger>
          ))}
          <TabsTrigger value="restock">Restock</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="sheet-scroll">
        <div
          className="sheet-grid"
          data-focus={active === "stock" || active === "restock" ? active : "kit"}
          style={style}
        >
          <span className="c-item c-group" />
          <span className="c-stock c-group">Stock</span>
          {kits.length ? (
            <span className="c-kits c-group">Per kit</span>
          ) : null}
          <span className="c-restock c-group restock-group">Restock</span>
          <span className="c-remove c-group" />

          <span className="c-item c-head">Item</span>
          <span className={`c-stock c-head num-head${on("stock")}`}>On hand</span>
          {kits.map((kit, index) => (
            <div key={kit.id} className={`c-kit c-head kit-head${on(kit.id)}`}>
              <div className="kit-name">
                <label className="visually-hidden" htmlFor={`kit-name-${kit.id}`}>
                  Kit {index + 1} name
                </label>
                <Input
                  id={`kit-name-${kit.id}`}
                  className="name-input"
                  value={kit.name}
                  placeholder={`Kit ${index + 1}`}
                  onChange={(event) =>
                    onEdit(updateKit(scenario, kit.id, { name: event.target.value }))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="mini-remove"
                  aria-label={`Remove ${kitLabel(index)}`}
                  onClick={() => onEdit(removeKit(scenario, kit.id))}
                >
                  <XmarkIcon aria-hidden="true" />
                </Button>
              </div>
              <div className="kit-targets">
                <IntField
                  id={`kit-demand-${kit.id}`}
                  label="Want"
                  className="mini"
                  value={kit.demand}
                  max={CAPS.maxDemandPacks}
                  onChange={(demand) => onEdit(updateKit(scenario, kit.id, { demand }))}
                />
                <IntField
                  id={`kit-min-${kit.id}`}
                  label="Promise"
                  className="mini"
                  value={kit.committedMin}
                  max={kit.demand}
                  onChange={(committedMin) =>
                    onEdit(updateKit(scenario, kit.id, { committedMin }))
                  }
                />
              </div>
            </div>
          ))}
          <span className={`c-restock c-head num-head${on("restock")}`}>Pack size</span>
          <span className={`c-restock c-head num-head${on("restock")}`}>Pack price</span>
          <span className={`c-restock c-head buy-head${on("restock")}`}>Suggested buy</span>
          <span className={`c-remove c-head${on("stock")}`} />

          {items.length === 0 ? (
            <p className="sheet-empty">No supplies yet. Add the first item below.</p>
          ) : null}
          {items.map((item, index) => {
            const name = itemLabel(index);
            const buy = buys.get(item.id);
            const zero = (n: number) => (n === 0 ? " is-zero" : "");
            return (
              <div className="sheet-row" key={item.id}>
                <div className="c-item c-cell item-cell">
                  <label className="visually-hidden" htmlFor={`item-name-${item.id}`}>
                    Item {index + 1} name
                  </label>
                  <Input
                    id={`item-name-${item.id}`}
                    className="name-input"
                    value={item.name}
                    placeholder={`Item ${index + 1}`}
                    onChange={(event) =>
                      onEdit(updateItem(scenario, item.id, { name: event.target.value }))
                    }
                  />
                  {limiting.has(item.id) ? <span className="tag-dark">runs out</span> : null}
                </div>
                <div className={`c-stock c-cell${on("stock")}`}>
                  <IntField
                    id={`item-stock-${item.id}`}
                    label={`${name} on hand`}
                    hideLabel
                    className="strong"
                    value={item.stock}
                    max={CAPS.maxStock}
                    onChange={(stock) => onEdit(updateItem(scenario, item.id, { stock }))}
                  />
                </div>
                {kits.map((kit, kitIndex) => {
                  const qty = kit.recipe[item.id] ?? 0;
                  return (
                    <div key={kit.id} className={`c-kit c-cell${on(kit.id)}`}>
                      <IntField
                        id={`rec-${kit.id}-${item.id}`}
                        label={`${name} per ${kitLabel(kitIndex)}`}
                        hideLabel
                        className={`recipe${zero(qty)}`}
                        value={qty}
                        max={CAPS.maxRecipeQty}
                        onChange={(next) => onEdit(setRecipeQty(scenario, kit.id, item.id, next))}
                      />
                    </div>
                  );
                })}
                <div className={`c-restock c-cell${on("restock")}`}>
                  <IntField
                    id={`pack-${item.id}`}
                    label={`${name} pack size`}
                    hideLabel
                    className={zero(item.buyPackSize).trim()}
                    value={item.buyPackSize}
                    max={CAPS.maxBuyPackSize}
                    onChange={(buyPackSize) =>
                      onEdit(updateItem(scenario, item.id, { buyPackSize }))
                    }
                  />
                </div>
                <div className={`c-restock c-cell${on("restock")}`}>
                  <MoneyField
                    id={`price-${item.id}`}
                    label={`${name} pack price`}
                    hideLabel
                    className={zero(item.buyPackSize).trim()}
                    cents={item.buyPackPriceCents}
                    maxCents={CAPS.maxBudgetCents}
                    onChange={(buyPackPriceCents) =>
                      onEdit(updateItem(scenario, item.id, { buyPackPriceCents }))
                    }
                  />
                </div>
                <div className={`c-restock c-cell buy-cell${on("restock")}`}>
                  {buy ? (
                    <span className="tag-accent">
                      +{buy.packs} {buy.packs === 1 ? "pack" : "packs"} · {formatUsd(buy.costCents)}
                    </span>
                  ) : item.buyPackSize === 0 ? (
                    <span className="muted">Not sold</span>
                  ) : null}
                </div>
                <div className={`c-remove c-cell${on("stock")}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${name}`}
                    onClick={() => onEdit(removeItem(scenario, item.id))}
                  >
                    <XmarkIcon aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sheet-actions">
        <Button
          variant="outline"
          className="dashed"
          onClick={() => onEdit(addItem(scenario))}
          disabled={items.length >= CAPS.maxItems}
        >
          <PlusIcon aria-hidden="true" />
          Add item
        </Button>
        <Button
          variant="outline"
          className="dashed"
          onClick={() => onEdit(addKit(scenario))}
          disabled={kits.length >= CAPS.maxKits}
        >
          <PlusIcon aria-hidden="true" />
          Add kit type
        </Button>
      </div>
    </section>
  );
}
