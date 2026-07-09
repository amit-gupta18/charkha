"use client";

import { useEffect, useRef, useState } from "react";

export type CreamSelectOption = string | { value: string; label: string };

function normalize(options: readonly CreamSelectOption[]) {
  return options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: readonly CreamSelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

export function CreamSelect({ value, onChange, options, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opts = normalize(options);
  const selected = opts.find((o) => o.value === value);
  const display = selected?.label ?? placeholder ?? "Select…";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className={`cream-select${open ? " is-open" : ""}`} ref={ref}>
      <button
        type="button"
        className="cream-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={!selected && placeholder ? "cream-select-placeholder" : undefined}>{display}</span>
        <svg className="cream-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul className="cream-select-menu" role="listbox">
          {placeholder !== undefined && (
            <li
              role="option"
              aria-selected={!value}
              className={`cream-select-option${!value ? " is-selected" : ""}`}
              onClick={() => pick("")}
            >
              {placeholder}
            </li>
          )}
          {opts.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`cream-select-option${o.value === value ? " is-selected" : ""}`}
              onClick={() => pick(o.value)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
