export type TermsTemplateId = "default_interiors" | "default_false_ceiling";

export type TermsVars = {
  clientName?: string;
  projectName?: string;
  quoteId?: string;
  validDays?: number;
  warrantyMonths?: number;
  paymentSchedule?: string;
};

export const defaultTerms: Record<TermsTemplateId, string[]> = {
  default_interiors: [
    "Prices are inclusive of margin; GST will be charged extra as applicable.",
    "Quote validity: {validDays} days from the date of issue.",
    "Payment terms: {paymentSchedule}.",
    "Standard warranty: {warrantyMonths} months on modular components against manufacturing defects.",
    "Any civil, electrical, and plumbing works are excluded unless specifically mentioned.",
    "Material brands are as selected; equivalents may be used upon client approval in case of unavailability.",
    "Site access, power, and water to be provided by client."
  ],
  default_false_ceiling: [
    "Rates include framework, boards/grids, and standard jointing compound as per brand selection.",
    "Painting items, lights, and fan hook rods are billed separately under 'OTHERS'.",
    "Quote validity: {validDays} days from the date of issue.",
    "Warranty: {warrantyMonths} months against sagging and cracks under normal usage.",
    "Hidden services (electrical/AC/Fire) routing is not included unless specified.",
    "Scaffolding and safety to be provided where necessary."
  ],
};

export function renderTerms(lines: string[], vars: TermsVars = {}): string[] {
  const v = {
    validDays: 15,
    warrantyMonths: 12,
    paymentSchedule: "50% booking, 40% mid, 10% handover",
    ...vars
  };
  
  return lines.map(l =>
    l
      .replaceAll("{clientName}", v.clientName ?? "")
      .replaceAll("{projectName}", v.projectName ?? "")
      .replaceAll("{quoteId}", v.quoteId ?? "")
      .replaceAll("{validDays}", String(v.validDays))
      .replaceAll("{warrantyMonths}", String(v.warrantyMonths))
      .replaceAll("{paymentSchedule}", v.paymentSchedule)
  );
}

export const defaultTermsConfig = {
  interiors: {
    useDefault: true,
    templateId: "default_interiors" as TermsTemplateId,
    customText: "",
    vars: {
      validDays: 15,
      warrantyMonths: 12,
      paymentSchedule: "50% booking, 40% mid, 10% handover"
    }
  },
  falseCeiling: {
    useDefault: true,
    templateId: "default_false_ceiling" as TermsTemplateId,
    customText: "",
    vars: {
      validDays: 15,
      warrantyMonths: 12,
      paymentSchedule: "50% booking, 40% mid, 10% handover"
    }
  }
};
