import { create } from "zustand";
import { persist } from "zustand/middleware";
import { monthStr } from "@/lib/format";

type DashboardUiState = {
  selectedMonth: string;
  flashStats: boolean;
  setSelectedMonth: (month: string) => void;
  triggerFlash: () => void;
};

export const useDashboardUiStore = create<DashboardUiState>()(
  persist(
    (set) => ({
      selectedMonth: monthStr(new Date()),
      flashStats: false,
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      triggerFlash: () => {
        set({ flashStats: true });
        setTimeout(() => set({ flashStats: false }), 1200);
      },
    }),
    { name: "dashboard-ui", partialize: (state) => ({ selectedMonth: state.selectedMonth }) },
  ),
);
