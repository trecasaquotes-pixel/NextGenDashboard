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
    "PRICING & TAXES: All prices are inclusive of design, material, fabrication, installation, and margin. GST at applicable rates will be charged extra on the total invoice value.",
    "QUOTE VALIDITY: This quotation is valid for {validDays} days from the date of issue. Prices are subject to change thereafter based on material cost fluctuations and market conditions.",
    "PAYMENT SCHEDULE: {paymentSchedule}. Payments must be made as per the agreed schedule. Delays in payment may result in work suspension and revised timelines.",
    "WARRANTY COVERAGE: {warrantyMonths} months warranty on modular components against manufacturing defects only. Warranty excludes damage due to misuse, water exposure, termite/borer attack, natural wear and tear, or unauthorized modifications.",
    "SCOPE OF WORK: The quotation covers only items explicitly mentioned. Civil work, false ceiling, electrical, plumbing, HVAC, painting (unless specified), site cleaning, disposal of debris, and structural modifications are excluded unless specifically itemized.",
    "MATERIALS & BRANDS: Materials and brands are as specified in the quotation. In case of unavailability, equivalent alternatives may be used with prior client approval. Brand warranties, if any, are as per manufacturer terms.",
    "SITE CONDITIONS: Client shall provide uninterrupted access to site, adequate working space, power supply (single/three phase as needed), water connection, and secure storage for materials. Any delays due to site access issues will extend project timelines proportionally.",
    "MEASUREMENT & QUANTITIES: All measurements are approximate and subject to site verification. Final quantities will be calculated based on actual site dimensions. Variations up to 5% are considered normal and will be billed accordingly.",
    "TIMELINE: Project completion timelines will be confirmed post design approval and advance payment. Timelines exclude delays due to client approvals, site readiness, material procurement issues, or force majeure events.",
    "CHANGE ORDERS: Any modifications or additions to the approved scope will be charged separately as per prevailing rates. Change orders may impact project timelines and require revised payment schedules.",
    "DEFECTS LIABILITY: TRECASA will rectify any defects in workmanship reported within the warranty period, subject to verification. Liability is limited to repair/replacement of defective components only.",
    "FORCE MAJEURE: TRECASA shall not be liable for delays or non-performance due to acts of God, natural disasters, pandemics, government restrictions, labor strikes, material shortages, or other events beyond reasonable control.",
    "DISPUTE RESOLUTION: Any disputes arising from this quotation shall be resolved through amicable discussion. If unresolved, disputes shall be subject to arbitration under Indian Arbitration and Conciliation Act, 1996, with jurisdiction limited to courts in [City].",
    "GOVERNING LAW: This quotation and any resulting contract shall be governed by the laws of India. Acceptance of this quotation constitutes agreement to these terms and conditions."
  ],
  default_false_ceiling: [
    "SCOPE & INCLUSIONS: Rates include framework (MS/GI channels), boards/grids as per selected brand, standard jointing compound, taping, and basic finishing. Premium finishes, custom designs, and decorative elements are excluded unless specified.",
    "EXCLUSIONS: Painting, POP/gypsum work, lighting fixtures, fan hook rods, electrical conduit routing, AC ducts, fire safety equipment, and hidden service routing (HVAC/electrical/plumbing) are billed separately under 'OTHERS' or excluded.",
    "PRICING & TAXES: All prices are inclusive of material, labor, installation, and margin. GST at applicable rates will be charged extra. Prices are subject to change based on material cost fluctuations.",
    "QUOTE VALIDITY: This quotation is valid for {validDays} days from date of issue. Post expiry, prices and availability are subject to reconfirmation.",
    "PAYMENT TERMS: {paymentSchedule}. Timely payment is essential for uninterrupted project execution. Payment delays may extend timelines.",
    "WARRANTY: {warrantyMonths} months warranty against sagging, cracks, and joint failures under normal usage conditions. Warranty excludes water seepage damage, impact damage, structural issues, unauthorized modifications, or natural calamities.",
    "HEIGHT & ACCESS: Quoted rates assume standard ceiling heights (9-10 feet). Work requiring scaffolding above 10 feet, stilt/tower scaffolding, or specialized access equipment will be charged extra as per actual requirements.",
    "SITE CONDITIONS: Client to provide clear working area, adequate lighting, power supply, water connection, material storage space, and safe access. Delays due to site unpreparedness will extend timelines proportionally.",
    "STRUCTURAL REQUIREMENTS: Client to ensure structural integrity of existing ceiling/walls. TRECASA is not responsible for structural failures, water seepage, or pre-existing defects. Structural reinforcement, if required, will be charged separately.",
    "MEASUREMENT: All measurements are approximate and subject to site verification. Final area calculations will be based on actual site measurements. Variations up to 5% are normal and will be billed as per actuals.",
    "TIMELINE: Execution timelines depend on design approval, material availability, and site readiness. Timelines exclude delays due to approvals, site access, material procurement, or force majeure events.",
    "MATERIAL SUBSTITUTION: In case of unavailability, materials may be substituted with equivalent brands/grades with prior client approval. Brand warranties, if any, are as per manufacturer terms.",
    "CHANGE ORDERS: Modifications to approved design/scope will be charged as per prevailing rates and may impact project timelines. Written approval required for all change orders.",
    "LIABILITY LIMITATION: TRECASA's liability is limited to repair/replacement of defective work within warranty period. No liability for consequential damages, business losses, or damages beyond the contract value.",
    "FORCE MAJEURE: TRECASA shall not be liable for delays/non-performance due to acts of God, pandemics, government orders, strikes, material shortages, or events beyond reasonable control.",
    "DISPUTE RESOLUTION: Disputes shall be resolved amicably through discussion. Unresolved disputes subject to arbitration under Indian Arbitration Act, 1996. Jurisdiction limited to courts in [City].",
    "GOVERNING LAW: This quotation is governed by laws of India. Acceptance constitutes agreement to these terms and conditions."
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
