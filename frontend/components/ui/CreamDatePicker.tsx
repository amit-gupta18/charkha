"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parseYmd(v: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function toYmd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(v: string, emptyLabel = "Pick a date") {
  if (!v) return emptyLabel;
  const p = parseYmd(v);
  if (!p) return emptyLabel;
  return new Date(p.y, p.m, p.d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
};

export function CreamDatePicker({ value, onChange, disabled, placeholder = "Pick a date", allowClear }: Props) {
  const parsed = parseYmd(value) ?? { y: new Date().getFullYear(), m: new Date().getMonth(), d: new Date().getDate() };
  const [open, setOpen] = useState(false);
  const [viewY, setViewY] = useState(parsed.y);
  const [viewM, setViewM] = useState(parsed.m);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const p = parseYmd(value);
    if (p) { setViewY(p.y); setViewM(p.m); }
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
  }, [open, value]);

  const cells = useMemo(() => {
    const first = new Date(viewY, viewM, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const items: { day: number | null; y: number; m: number }[] = [];
    for (let i = 0; i < startOffset; i++) items.push({ day: null, y: viewY, m: viewM });
    for (let d = 1; d <= daysInMonth; d++) items.push({ day: d, y: viewY, m: viewM });
    return items;
  }, [viewY, viewM]);

  function prevMonth() {
    if (viewM === 0) { setViewM(11); setViewY((y) => y - 1); }
    else setViewM((m) => m - 1);
  }

  function nextMonth() {
    if (viewM === 11) { setViewM(0); setViewY((y) => y + 1); }
    else setViewM((m) => m + 1);
  }

  function pickDay(day: number) {
    onChange(toYmd(viewY, viewM, day));
    setOpen(false);
  }

  const today = new Date();
  const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className={`cream-select cream-date${open ? " is-open" : ""}`} ref={ref}>
      <button
        type="button"
        className="cream-select-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={!value ? "cream-select-placeholder" : undefined}>{formatDisplay(value, placeholder)}</span>
        <svg className="cream-select-chevron cream-date-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {open && (
        <div className="cream-date-panel">
          <div className="cream-date-header">
            <button type="button" className="cream-date-nav" onClick={prevMonth} aria-label="Previous month">‹</button>
            <span className="cream-date-title">{MONTHS[viewM]} {viewY}</span>
            <button type="button" className="cream-date-nav" onClick={nextMonth} aria-label="Next month">›</button>
          </div>
          <div className="cream-date-weekdays">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="cream-date-grid">
            {cells.map((c, i) => {
              if (c.day === null) return <span key={`e-${i}`} className="cream-date-cell empty" />;
              const ymd = toYmd(c.y, c.m, c.day);
              const isSelected = value === ymd;
              const isToday = ymd === todayYmd;
              return (
                <button
                  key={ymd}
                  type="button"
                  className={`cream-date-cell${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                  onClick={() => pickDay(c.day!)}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
          <button type="button" className="cream-date-today" onClick={() => { onChange(todayYmd); setOpen(false); }}>
            Today
          </button>
          {allowClear && value && (
            <button type="button" className="cream-date-today" style={{ marginTop: 6 }} onClick={() => { onChange(""); setOpen(false); }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
