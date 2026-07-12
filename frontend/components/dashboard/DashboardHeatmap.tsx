"use client";

import { useMemo } from "react";
import { dateKey, expenseShare, inr } from "@/lib/format";
import type { Expense } from "@/lib/types";

type HeatmapCell = { date: string; total: number; top: string };
type HeatmapMonth = { key: string; label: string; weeks: (HeatmapCell | null)[][] };

function padWeekColumn(days: (HeatmapCell | null)[]) {
  const column = [...days];
  while (column.length < 7) column.push(null);
  return column.slice(0, 7);
}

function buildMonthHeatmap(
  year: number,
  monthIndex: number,
  dayData: Map<string, { total: number; top: string }>,
): HeatmapMonth {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingBlanks = first.getUTCDay();

  const flatDays: (HeatmapCell | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) flatDays.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${monthKey}-${String(day).padStart(2, "0")}`;
    const info = dayData.get(ds);
    flatDays.push({ date: ds, total: info?.total ?? 0, top: info?.top ?? "" });
  }

  const weeks: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < flatDays.length; i += 7) {
    weeks.push(padWeekColumn(flatDays.slice(i, i + 7)));
  }

  return {
    key: monthKey,
    label: new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
    weeks,
  };
}

export function DashboardHeatmap({ expenses, dayThreshold }: { expenses: Expense[]; dayThreshold: number }) {
  const dayData = useMemo(() => {
    const byDate = new Map<string, Map<string, number>>();

    for (const expense of expenses) {
      const key = dateKey(expense.date);
      const categories = byDate.get(key) ?? new Map<string, number>();
      categories.set(expense.category, (categories.get(expense.category) ?? 0) + expenseShare(expense));
      byDate.set(key, categories);
    }

    const result = new Map<string, { total: number; top: string }>();
    for (const [date, categories] of byDate) {
      const total = Array.from(categories.values()).reduce((sum, amount) => sum + amount, 0);
      const top = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      result.set(date, { total, top });
    }
    return result;
  }, [expenses]);

  const year = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  const heatmapMonths = useMemo(() => {
    const months: HeatmapMonth[] = [];
    for (let monthIndex = 0; monthIndex <= currentMonthIndex; monthIndex++) {
      months.push(buildMonthHeatmap(year, monthIndex, dayData));
    }
    return months;
  }, [dayData, year, currentMonthIndex]);

  function cellClass(total: number) {
    if (total <= 0) return "heatmap-none";
    if (total < dayThreshold) return "heatmap-light";
    if (total < dayThreshold * 2) return "heatmap-normal";
    if (total < dayThreshold * 3) return "heatmap-high";
    return "heatmap-very";
  }

  if (heatmapMonths.length === 0) {
    return <p className="chart-empty-text">No heatmap data yet.</p>;
  }

  return (
    <div>
      <div className="heatmap-scroll heatmap-scroll-dashboard">
        <div className="heatmap-months">
          {heatmapMonths.map((monthBlock) => (
            <div key={monthBlock.key} className="heatmap-month-block">
              <p className="heatmap-month-label">{monthBlock.label}</p>
              <div className="heatmap-week-columns">
                {monthBlock.weeks.map((week, weekIndex) => (
                  <div key={`${monthBlock.key}-w${weekIndex}`} className="heatmap-week-column">
                    {week.map((cell, dayIndex) =>
                      cell ? (
                        <div
                          key={cell.date}
                          className={`heatmap-cell ${cellClass(cell.total)}`}
                          title={
                            cell.date +
                            (cell.total > 0 ? ` · ${inr(cell.total)}${cell.top ? ` · ${cell.top}` : ""}` : " · no spend")
                          }
                        />
                      ) : (
                        <div key={`${monthBlock.key}-e-${weekIndex}-${dayIndex}`} className="heatmap-cell heatmap-empty" />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <span className="heatmap-cell heatmap-none" />
        <span className="heatmap-cell heatmap-light" />
        <span className="heatmap-cell heatmap-normal" />
        <span className="heatmap-cell heatmap-high" />
        <span className="heatmap-cell heatmap-very" />
        <span>More</span>
      </div>
    </div>
  );
}
