import { apiRequest } from "@/lib/queryClient";
import type { GlobalRulesRow, NewGlobalRulesRow } from "@shared/schema";

export interface PaymentScheduleItem {
  label: string;
  percent: number;
}

export interface CityFactorItem {
  city: string;
  factor: number;
}

export interface GlobalRulesData {
  id: string;
  buildTypeDefault: string;
  gstPercent: number;
  validityDays: number;
  bedroomFactorBase: number;
  perBedroomDelta: string | number;
  paymentScheduleJson: string;
  cityFactorsJson: string;
  footerLine1: string;
  footerLine2: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GlobalRulesFormData {
  buildTypeDefault: string;
  gstPercent: number;
  validityDays: number;
  bedroomFactorBase: number;
  perBedroomDelta: number;
  paymentSchedule: PaymentScheduleItem[];
  cityFactors: CityFactorItem[];
  footerLine1: string;
  footerLine2: string;
}

export async function getGlobalRules(): Promise<GlobalRulesData> {
  const res = await fetch("/api/admin/global-rules", { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch global rules: ${res.statusText}`);
  return res.json();
}

export async function saveGlobalRules(data: GlobalRulesFormData): Promise<GlobalRulesData> {
  // Transform form data to API format
  const apiData = {
    buildTypeDefault: data.buildTypeDefault,
    gstPercent: data.gstPercent,
    validityDays: data.validityDays,
    bedroomFactorBase: data.bedroomFactorBase,
    perBedroomDelta: data.perBedroomDelta,
    paymentScheduleJson: data.paymentSchedule,
    cityFactorsJson: data.cityFactors,
    footerLine1: data.footerLine1,
    footerLine2: data.footerLine2,
  };

  const res = await apiRequest("PUT", "/api/admin/global-rules", apiData);
  return res.json();
}

// Helper function to parse global rules data for the form
export function parseGlobalRulesForForm(data: GlobalRulesData): GlobalRulesFormData {
  let paymentSchedule: PaymentScheduleItem[] = [];
  let cityFactors: CityFactorItem[] = [];

  try {
    paymentSchedule = JSON.parse(data.paymentScheduleJson);
  } catch (e) {
    paymentSchedule = [];
  }

  try {
    cityFactors = JSON.parse(data.cityFactorsJson);
  } catch (e) {
    cityFactors = [];
  }

  return {
    buildTypeDefault: data.buildTypeDefault,
    gstPercent: data.gstPercent,
    validityDays: data.validityDays,
    bedroomFactorBase: data.bedroomFactorBase,
    perBedroomDelta:
      typeof data.perBedroomDelta === "string"
        ? parseFloat(data.perBedroomDelta)
        : data.perBedroomDelta,
    paymentSchedule,
    cityFactors,
    footerLine1: data.footerLine1,
    footerLine2: data.footerLine2,
  };
}
