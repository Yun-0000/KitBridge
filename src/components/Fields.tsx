import { Input } from "./ui/input";
import { useRef, useState } from "react";
import { commitIntegerDraft, commitMoneyDraft } from "../model/money";

type IntFieldProps = {
  id: string;
  label?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  onDirty?: () => void;
  labelledBy?: string;
  hideLabel?: boolean;
};

export function IntField({
  id,
  label,
  value,
  min = 0,
  max,
  onChange,
  onDirty,
  labelledBy,
  hideLabel,
}: IntFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const dirtied = useRef(false);
  const shown = draft ?? String(Number.isFinite(value) ? value : 0);

  return (
    <span className="field">
      {label ? (
        <label
          className={hideLabel ? "visually-hidden" : undefined}
          htmlFor={id}
        >
          {label}
        </label>
      ) : null}
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        min={min}
        max={max}
        value={shown}
        aria-label={label}
        aria-labelledby={labelledBy}
        onFocus={() => {
          dirtied.current = false;
          setDraft(String(Number.isFinite(value) ? value : 0));
        }}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw !== "" && !/^\d+$/.test(raw)) return;
          setDraft(raw);
          if (!dirtied.current && raw !== String(value)) {
            dirtied.current = true;
            onDirty?.();
          }
        }}
        onBlur={() => {
          const raw = draft ?? String(value);
          setDraft(null);
          dirtied.current = false;
          const next = commitIntegerDraft(raw, value);
          if (next !== value) onChange(next);
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
  onChange: (cents: number) => void;
  onDirty?: () => void;
};

export function MoneyField({
  id,
  label,
  cents,
  maxCents,
  onChange,
  onDirty,
  hideLabel,
}: MoneyFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const dirtied = useRef(false);
  const formatted = (Math.round(cents) / 100).toFixed(2);
  const shown = draft ?? formatted;

  return (
    <span className="field">
      <label className={hideLabel ? "visually-hidden" : undefined} htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={shown}
        aria-label={label}
        onFocus={() => {
          dirtied.current = false;
          setDraft(formatted);
        }}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
          setDraft(raw);
          if (!dirtied.current && raw !== formatted) {
            dirtied.current = true;
            onDirty?.();
          }
        }}
        onBlur={() => {
          const raw = draft ?? formatted;
          setDraft(null);
          dirtied.current = false;
          const next = commitMoneyDraft(raw, cents, maxCents);
          if (next !== cents) onChange(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </span>
  );
}
