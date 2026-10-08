import { useState } from "react";
import { Input } from "./ui/input";
import { commitIntegerDraft, commitMoneyDraft } from "../model/money";
import { cn } from "@/lib/utils";

/*
 * Numeric fields keep the raw text while focused and commit every valid
 * keystroke, so the plan follows along. Blur normalizes the display; an
 * empty field becomes 0.
 */

type IntFieldProps = {
  id: string;
  label: string;
  value: number;
  max?: number;
  hideLabel?: boolean;
  className?: string;
  onChange: (value: number) => void;
};

export function IntField({
  id,
  label,
  value,
  max,
  hideLabel,
  className,
  onChange,
}: IntFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    let next = commitIntegerDraft(raw, value);
    if (max !== undefined) next = Math.min(next, max);
    if (next !== value) onChange(next);
  };

  return (
    <span className={cn("field", className)}>
      <label className={hideLabel ? "visually-hidden" : undefined} htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="num"
        value={draft ?? String(value)}
        onFocus={(event) => {
          setDraft(String(value));
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw !== "" && !/^\d+$/.test(raw)) return;
          setDraft(raw);
          if (raw !== "") commit(raw);
        }}
        onBlur={() => {
          commit(draft ?? String(value));
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </span>
  );
}

type MoneyFieldProps = {
  id: string;
  label: string;
  cents: number;
  maxCents: number;
  hideLabel?: boolean;
  className?: string;
  onChange: (cents: number) => void;
};

export function MoneyField({
  id,
  label,
  cents,
  maxCents,
  hideLabel,
  className,
  onChange,
}: MoneyFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const formatted = (Math.round(cents) / 100).toFixed(2);
  const commit = (raw: string) => {
    const next = commitMoneyDraft(raw, cents, maxCents);
    if (next !== cents) onChange(next);
  };

  return (
    <span className={cn("field money", className)}>
      <label className={hideLabel ? "visually-hidden" : undefined} htmlFor={id}>
        {label}
      </label>
      <span className="money-input">
        <span aria-hidden="true">$</span>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="num"
          value={draft ?? formatted}
          onFocus={(event) => {
            setDraft(formatted);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
            setDraft(raw);
            if (raw !== "" && raw !== ".") commit(raw);
          }}
          onBlur={() => {
            commit(draft ?? formatted);
            setDraft(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </span>
    </span>
  );
}
