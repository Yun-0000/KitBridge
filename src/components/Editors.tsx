import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table";
import { TrashIcon, PlusIcon } from "./icons";
import { CAPS } from "../constants";
import { centsToDollars } from "../model/money";
import { purchasable } from "../model/scenario";
import type { Scenario } from "../types";
import { IntField, MoneyField } from "./Fields";

type EditorProps = {
  scenario: Scenario;
  step: number;
  onStep: (step: number) => void;
  onAddItem: () => void;
  onAddKit: () => void;
  onRemoveItem: (id: string) => void;
  onRemoveKit: (id: string) => void;
  onItemName: (id: string, name: string) => void;
  onItemStock: (id: string, stock: number) => void;
  onItemPack: (id: string, size: number) => void;
  onItemPrice: (id: string, cents: number) => void;
  onKitName: (id: string, name: string) => void;
  onKitDemand: (id: string, demand: number) => void;
  onKitMin: (id: string, min: number) => void;
  onRecipe: (kitId: string, itemId: string, qty: number) => void;
  onBudget: (cents: number) => void;
  onDirty: () => void;
};

export function Editors(props: EditorProps) {
  const { scenario, step, onStep } = props;

  return (
    <Tabs
      value={String(step)}
      onValueChange={(value) => onStep(Number(value))}
      className="editor-stack"
    >
      <TabsList aria-label="Drive inputs" className="input-tabs">
        <TabsTrigger value="0">Inventory</TabsTrigger>
        <TabsTrigger value="1">Kit recipes</TabsTrigger>
        <TabsTrigger value="2">Restock</TabsTrigger>
      </TabsList>
      <TabsContent
        value="0"
        forceMount
        hidden={step !== 0}
        className="panel"
        aria-labelledby="inventory-h"
      >
        <h2 id="inventory-h" className="visually-hidden">
          Inventory
        </h2>
        <p className="hint">Count individual items, not packs.</p>
        <div className="table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Item</TableHead>
                <TableHead scope="col">On hand</TableHead>
                <TableHead scope="col">
                  <span className="visually-hidden">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenario.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="muted">
                    No items yet. Add inventory or use a template.
                  </TableCell>
                </TableRow>
              ) : (
                scenario.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <label
                        className="visually-hidden"
                        htmlFor={`item-name-${item.id}`}
                      >
                        Item name {index + 1}
                      </label>
                      <Input
                        id={`item-name-${item.id}`}
                        type="text"
                        value={item.name}
                        onChange={(event) =>
                          props.onItemName(item.id, event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <IntField
                        id={`item-stock-${item.id}`}
                        label={`On hand: ${item.name || `item ${index + 1}`}`}
                        hideLabel
                        value={item.stock}
                        max={CAPS.maxStock}
                        onChange={(value) => props.onItemStock(item.id, value)}
                        onDirty={props.onDirty}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${item.name || "item"}`}
                        onClick={() => props.onRemoveItem(item.id)}
                      >
                        <TrashIcon aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="row-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={props.onAddItem}
            disabled={scenario.items.length >= CAPS.maxItems}
          >
            <PlusIcon aria-hidden="true" />
            Add item
          </Button>
        </div>
      </TabsContent>

      <TabsContent
        value="1"
        forceMount
        hidden={step !== 1}
        className="panel"
        aria-labelledby="recipes-h"
      >
        <h2 id="recipes-h" className="visually-hidden">
          Kit recipes
        </h2>
        <p className="hint">
          Choose supplies per kit and protect what you have already promised.
        </p>
        {scenario.kits.length === 0 ? (
          <p className="muted">No kits yet.</p>
        ) : (
          <Tabs
            key={scenario.kits.map((kit) => kit.id).join("-")}
            defaultValue={scenario.kits[0]?.id}
          >
            <TabsList className="kit-selector" aria-label="Kit to edit">
              {scenario.kits.map((kit) => (
                <TabsTrigger key={kit.id} value={kit.id}>
                  {kit.name || "Unnamed kit"}
                </TabsTrigger>
              ))}
            </TabsList>
            {scenario.kits.map((kit, kitIndex) => (
              <TabsContent
                value={kit.id}
                key={kit.id}
                className="pack-sheet"
                aria-labelledby={`kit-h-${kit.id}`}
              >
                <div className="kv">
                  <div>
                    <label htmlFor={`kit-name-${kit.id}`}>Kit name</label>
                    <Input
                      id={`kit-name-${kit.id}`}
                      type="text"
                      value={kit.name}
                      onChange={(event) =>
                        props.onKitName(kit.id, event.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => props.onRemoveKit(kit.id)}
                  >
                    Remove kit
                  </Button>
                </div>
                <div className="compare">
                  <IntField
                    id={`kit-demand-${kit.id}`}
                    label="Demand"
                    value={kit.demand}
                    max={CAPS.maxDemandPacks}
                    onChange={(value) => props.onKitDemand(kit.id, value)}
                    onDirty={props.onDirty}
                  />
                  <IntField
                    id={`kit-min-${kit.id}`}
                    label="Minimum promised"
                    value={kit.committedMin}
                    max={kit.demand}
                    onChange={(value) => props.onKitMin(kit.id, value)}
                    onDirty={props.onDirty}
                  />
                </div>
                <h3 id={`kit-h-${kit.id}`} className="visually-hidden">
                  {kit.name || `Kit ${kitIndex + 1}`} recipe
                </h3>
                <div className="table-wrap">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Item</TableHead>
                        <TableHead scope="col">Per kit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenario.items.map((item) => (
                        <TableRow key={`${kit.id}-${item.id}`}>
                          <TableCell>{item.name || item.id}</TableCell>
                          <TableCell>
                            <IntField
                              id={`rec-${kit.id}-${item.id}`}
                              label={`Qty of ${item.name || item.id} in ${kit.name || "kit"}`}
                              hideLabel
                              value={kit.recipe[item.id] ?? 0}
                              max={CAPS.maxRecipeQty}
                              onChange={(value) =>
                                props.onRecipe(kit.id, item.id, value)
                              }
                              onDirty={props.onDirty}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
        <div className="row-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={props.onAddKit}
            disabled={scenario.kits.length >= CAPS.maxKits}
          >
            <PlusIcon aria-hidden="true" />
            Add kit
          </Button>
        </div>
      </TabsContent>

      <TabsContent
        value="2"
        forceMount
        hidden={step !== 2}
        className="panel"
        aria-labelledby="restock-h"
      >
        <h2 id="restock-h" className="visually-hidden">
          Restock budget
        </h2>
        <p className="hint">
          Enter your own price estimates, up to{" "}
          {`$${centsToDollars(CAPS.maxBudgetCents).toFixed(0)}`}. Pack size 0
          means unavailable; price 0 with a positive size means free. No
          purchase is placed.
        </p>
        <MoneyField
          id="budget"
          label="Budget (USD)"
          cents={scenario.budgetCents}
          maxCents={CAPS.maxBudgetCents}
          onChange={props.onBudget}
          onDirty={props.onDirty}
        />
        <div className="table-wrap budget-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Item</TableHead>
                <TableHead scope="col">Pack size</TableHead>
                <TableHead scope="col">Pack price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenario.items.map((item) => (
                <TableRow key={`buy-${item.id}`}>
                  <TableCell>
                    {item.name || item.id}
                    {purchasable(item) ? "" : " · not for sale"}
                  </TableCell>
                  <TableCell>
                    <IntField
                      id={`pack-${item.id}`}
                      label={`Buy-pack size for ${item.name || item.id}`}
                      hideLabel
                      value={item.buyPackSize}
                      max={CAPS.maxBuyPackSize}
                      onChange={(value) => props.onItemPack(item.id, value)}
                      onDirty={props.onDirty}
                    />
                  </TableCell>
                  <TableCell>
                    <MoneyField
                      id={`price-${item.id}`}
                      label={`Pack price for ${item.name || item.id}`}
                      hideLabel
                      cents={item.buyPackPriceCents}
                      maxCents={CAPS.maxBudgetCents}
                      onChange={(value) => props.onItemPrice(item.id, value)}
                      onDirty={props.onDirty}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
