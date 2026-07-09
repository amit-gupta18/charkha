"use client";

import { useMemo } from "react";
import { CreamSelect } from "./CreamSelect";
import { monthStr } from "@/lib/format";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  monthsBack?: number;
};

export function CreamMonthPicker({ value, onChange, disabled, monthsBack = 24 }: Props) {
  const options = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const v = monthStr(d);
      list.push({
        value: v,
        label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      });
    }
    return list;
  }, [monthsBack]);

  return <CreamSelect value={value} onChange={onChange} options={options} disabled={disabled} />;
}
