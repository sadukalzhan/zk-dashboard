// Core types for the ЗК-Дашборд

export type LineNumber = 1 | 2;

export type SourceEntry = {
  id: string;
  line: LineNumber;
  year: number;
  month: number; // 1..12
  spreadsheetId: string;
  url: string;
  createdAt: string;
};

export type MonthOption = {
  year: number;
  month: number;
  hasLine1: boolean;
  hasLine2: boolean;
};

export type CellValue = string | number | Date | null;
export type SheetGrid = CellValue[][];

// ---------- Parsed data shapes (per line, per month) ----------

export type MonthlyOutputRow = {
  monthLabel: string; // e.g. "МАЙ"
  monthNumber: number; // 1..12
  outputM2: number;
  downtimeMin: number;
};

export type MonthlyOutput = {
  byMonth: MonthlyOutputRow[];
  totals: { outputM2: number; downtimeMin: number };
};

// Downtime breakdown by category (day/night), per area
export type DowntimeCategory = "mechanical" | "electrical" | "organizational";

export type DowntimeArea =
  | "press"
  | "lg"
  | "kiln"
  | "rectification"
  | "sortingPacking";

export type DowntimeDay = {
  day: number; // 1..31
  shifts: {
    day: number; // total downtime min, day shift
    night: number; // total downtime min, night shift
  };
  byCategory: {
    mechanical: { day: number; night: number };
    electrical: { day: number; night: number };
    organizational: { day: number; night: number };
  };
  // Detail by reason (key = reason text)
  reasonsByShift: {
    day: Record<string, number>;
    night: Record<string, number>;
  };
};

export type AreaDowntime = {
  area: DowntimeArea;
  days: DowntimeDay[];
  totals: {
    mechanical: number;
    electrical: number;
    organizational: number;
    total: number;
  };
};

// Shift report — one per day per shift (day/night)
export type ShiftReport = {
  day: number;
  shift: "day" | "night";
  date?: string;
  master?: string;
  press: {
    productions: Array<{ name: string; count: number; size: string; cycles?: number; m2: number; workMin?: number; downMin?: number; reasons?: string }>;
    totalM2: number;
    workMin: number;
    downMin: number;
  };
  lg: {
    inM2: number;
    outM2: number;
    workMin: number;
    downMin: number;
    notes?: string;
  };
  kiln: {
    inM2: number;
    outM2: number;
    workMin: number;
    downMin: number;
    temperature?: number;
    cycleMin?: number;
  };
  rectification: {
    inM2: number;
    outM2: number;
    losses?: number;
  };
  sorting: {
    inM2: number;
    aClassM2: number;
    bClassM2: number;
    defectM2: number;
  };
  oee?: number;
  technicalParams?: {
    pressCycleMin?: number;
    kilnCycleMin?: number;
    kilnTemperatureC?: number;
  };
};

export type LineMonthData = {
  line: LineNumber;
  year: number;
  month: number;
  source?: SourceEntry;
  monthly: MonthlyOutput | null;
  downtime: Partial<Record<DowntimeArea, AreaDowntime>>;
  shifts: ShiftReport[];
  packaging: {
    aClassM2: number;
    bClassM2: number;
    defectM2: number;
    aClassPct: number;
    bClassPct: number;
    defectPct: number;
    totalM2: number;
  } | null;
  kpi: {
    outputM2: number;
    outputPrevM2?: number;
    downtimeMin: number;
    oee?: number;
    aClassM2: number;
    bClassM2: number;
    defectM2: number;
  } | null;
  parameters: {
    pressCycleMin?: number;
    kilnCycleMin?: number;
    kilnTemperatureC?: number;
    oee?: number;
  } | null;
  losses: Array<{
    stage: string;
    inM2: number;
    outM2: number;
    lossesM2: number;
    lossesPct: number;
  }>;
  // For Block 4 heatmap
  heatmap: {
    area: DowntimeArea;
    days: Array<{ day: number; dayMin: number; nightMin: number }>;
  }[];
  errors: string[];
};

// ---------- Finance ----------

export type FinanceSourceEntry = {
  id: string;
  kind: "finance";
  year: number;
  spreadsheetId: string;
  url: string;
  createdAt: string;
};

// One section of the P&L (e.g. "I. ДОХОДЫ ОТ РЕАЛИЗАЦИИ", "II. СЕБЕСТОИМОСТЬ")
export type FinanceSection = {
  title: string;
  rows: Array<{ label: string; values: number[]; total: number }>;
  totals: number[]; // 12 months
  totalYear: number;
};

export type FinanceMargins = {
  grossMarginPct: number[]; // 12 monthly % (0..1)
  ebitMarginPct: number[];
  netMarginPct: number[];
  yearGross: number;
  yearEbit: number;
  yearNet: number;
};

export type FinanceStarRow = {
  label: string; // e.g. "★ ИТОГО ВЫРУЧКА", "★★ ЧИСТАЯ ПРИБЫЛЬ"
  values: number[]; // 12 months
  total: number;
};

export type ProfitLoss = {
  sections: FinanceSection[];
  stars: FinanceStarRow[]; // key star rows in order found
  // Derived top-level metrics (best-effort by label match)
  revenue?: FinanceStarRow;
  cogs?: FinanceStarRow;
  grossProfit?: FinanceStarRow;
  ebitda?: FinanceStarRow;
  ebit?: FinanceStarRow;
  ebt?: FinanceStarRow;
  netProfit?: FinanceStarRow;
  margins: FinanceMargins;
};

export type CashFlow = {
  beginningBalance: number[]; // 12 months
  inflowsBySection: FinanceSection[]; // 1. Оп., 2. Инв., 3. Фин.
  outflowsBySection: FinanceSection[];
  totalInflows: number[];
  totalOutflows: number[];
  netCashFlow: number[];
  endingBalance: number[];
};

export type FinanceData = {
  year: number;
  source?: FinanceSourceEntry;
  pl: ProfitLoss | null;
  cashFlow: CashFlow | null;
  errors: string[];
};

// ---------- Finished products ----------

export type FinishedFormat = 60 | 120;

export type SaleRow = {
  brand: string;
  type: "made" | "sale";
  format: FinishedFormat;
  month: string;
  monthNumber: number;
  year: number;
  design: string;
  grade: string;
  quantity: number;
};

export type MovementRow = {
  brand: string;
  design: string;
  grade: string;
  format: FinishedFormat;
  month: string;
  monthNumber: number;
  year: number;
  produced: number;
  sold: number;
  balance: number;
  rowColor?: string;
};

export type InventoryStatus = "critical" | "excess" | "stale" | "ok";

export type InventoryItem = {
  brand: string;
  design: string;
  format: FinishedFormat;
  currentBalance: number;
  lastSale: number;
  overproductionCount: number;
  excessProduction: number;
  status: InventoryStatus;
};

export type FinishedProductsDashboard = {
  kpis: {
    totalSales: number;
    totalMade: number;
    leadingBrand: string;
    topDesign: string;
  };
  monthlySales: Array<{ month: string; "2023": number; "2024": number; "2025": number }>;
  brandShare: Array<{ brand: string; sales: number; pct: number }>;
  formatSplit: Array<{ format: string; sales: number; made: number }>;
  topDesigns: Array<{ design: string; sales: number }>;
  yearlyDynamics: Array<{ year: number; sales: number; made: number }>;
};

export type FinishedProductsData = {
  structured: SaleRow[];
  movement: MovementRow[];
  dashboard: FinishedProductsDashboard;
  inventory: InventoryItem[];
  errors: string[];
};
