"use client";

import { inr } from "@/lib/format";

export function BentoCard({
  title,
  subtitle,
  span = 1,
  children,
  href,
  action,
}: {
  title: string;
  subtitle?: string;
  span?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <div className={`bento-card bento-span-${span}`}>
      <div className="bento-card-header">
        <div>
          <p className="bento-card-title">{title}</p>
          {subtitle && <p className="bento-card-sub">{subtitle}</p>}
        </div>
        {href && (
          <a href={href} className="bento-card-link">
            {action ?? "View →"}
          </a>
        )}
      </div>
      {children}
    </div>
  );
}

const CHART_COLORS = [
  "var(--accent)",
  "var(--blue)",
  "var(--orange)",
  "var(--green)",
  "var(--red)",
  "#9B7EDE",
  "#E8A838",
  "#5BA4CF",
];

export type ChartSegment = { label: string; value: number; color?: string };

function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  const startRad = ((start - 90) * Math.PI) / 180;
  const endRad = ((end - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function describeDonutArc(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  const startRad = ((start - 90) * Math.PI) / 180;
  const endRad = ((end - 90) * Math.PI) / 180;
  const x1o = cx + outer * Math.cos(startRad);
  const y1o = cy + outer * Math.sin(startRad);
  const x2o = cx + outer * Math.cos(endRad);
  const y2o = cy + outer * Math.sin(endRad);
  const x1i = cx + inner * Math.cos(endRad);
  const y1i = cy + inner * Math.sin(endRad);
  const x2i = cx + inner * Math.cos(startRad);
  const y2i = cy + inner * Math.sin(startRad);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${x1o} ${y1o}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x2i} ${y2i}`,
    "Z",
  ].join(" ");
}

export function DonutChart({
  segments,
  size = 120,
  centerLabel,
  centerValue,
}: {
  segments: ChartSegment[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 2;
  const inner = outer * 0.58;

  if (total <= 0) {
    return (
      <div className="chart-empty" style={{ height: size }}>
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={outer} fill="var(--parchment)" stroke="var(--border-light)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={inner} fill="var(--card)" />
        </svg>
        <p>No data yet</p>
      </div>
    );
  }

  let angle = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg, i) => {
      const sweep = (seg.value / total) * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const path = describeDonutArc(cx, cy, outer, inner, start, end);
      return { ...seg, path, color: seg.color ?? CHART_COLORS[i % CHART_COLORS.length] };
    });

  return (
    <div className="donut-wrap">
      <div className="donut-svg-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {arcs.map((a) => (
            <path key={a.label} d={a.path} fill={a.color} />
          ))}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="donut-center">
            {centerValue && <span className="donut-center-value">{centerValue}</span>}
            {centerLabel && <span className="donut-center-label">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="chart-legend">
        {arcs.map((a) => (
          <li key={a.label}>
            <span className="chart-legend-dot" style={{ background: a.color }} />
            <span className="chart-legend-label">{a.label}</span>
            <span className="chart-legend-val">{inr(a.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PieChart({ segments, size = 100 }: { segments: ChartSegment[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  if (total <= 0) {
    return (
      <div className="chart-empty" style={{ height: size }}>
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="var(--parchment)" />
        </svg>
        <p>No data</p>
      </div>
    );
  }

  let angle = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg, i) => {
      const sweep = (seg.value / total) * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return { ...seg, path: describeArc(cx, cy, r, start, end), color: seg.color ?? CHART_COLORS[i % CHART_COLORS.length] };
    });

  return (
    <div className="pie-compact">
      <svg width={size} height={size}>
        {arcs.map((a) => (
          <path key={a.label} d={a.path} fill={a.color} stroke="var(--card)" strokeWidth={1.5} />
        ))}
      </svg>
      <ul className="chart-legend chart-legend-compact">
        {arcs.map((a) => (
          <li key={a.label}>
            <span className="chart-legend-dot" style={{ background: a.color }} />
            <span className="chart-legend-label">{a.label}</span>
            <span className="chart-legend-pct">{Math.round((a.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type BarItem = { label: string; value: number; highlight?: boolean };

export function BarChart({ items, maxValue, limit }: { items: BarItem[]; maxValue?: number; limit?: number }) {
  const peak = maxValue ?? Math.max(limit ?? 0, ...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return <p className="chart-empty-text">No spending recorded yet.</p>;
  }

  return (
    <div className="bar-chart">
      {items.map((item) => {
        const pct = Math.min(100, (item.value / peak) * 100);
        const over = limit != null && limit > 0 && item.value > limit;
        return (
          <div key={item.label} className="bar-row">
            <span className="bar-label">{item.label}</span>
            <div className="bar-track-wrap">
              <div className="bar-track">
                <div
                  className={`bar-fill${item.highlight ? " bar-fill-active" : ""}${over ? " bar-fill-over" : ""}`}
                  style={{ width: `${pct}%` }}
                />
                {limit != null && limit > 0 && (
                  <div className="bar-limit-line" style={{ left: `${Math.min(100, (limit / peak) * 100)}%` }} />
                )}
              </div>
            </div>
            <span className={`bar-value${over ? " bar-value-over" : ""}`}>{inr(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StatTile({ label, value, sub, flash }: { label: string; value: string; sub?: string; flash?: boolean }) {
  return (
    <div className={`bento-stat${flash ? " animate-flash" : ""}`}>
      <p className="bento-stat-label">{label}</p>
      <p className={`bento-stat-value${flash ? " animate-count-up" : ""}`}>{value}</p>
      {sub && <p className="bento-stat-sub">{sub}</p>}
    </div>
  );
}
