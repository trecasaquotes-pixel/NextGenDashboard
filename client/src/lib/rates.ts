// TODO (Week 2/3): Add pricing logic for False Ceiling items with brand-based rates
// TODO (Week 2/3): Add labor cost calculations separate from material costs
// TODO (Week 2/3): Add discount and tax calculation options
// TODO (Week 2/3): Add quotation templates with preset brand configurations

export const baseRates = {
  handmade: 1300,
  factory: 1500,
};

export const brandAdjustments = {
  core: {
    "Generic Ply": 0,
    "Century Ply": 100,
    "Green Ply": 100,
    "Kitply": 100,
    "HDHMR": 150,
    "BWP": 150,
    "MDF": 50,
    "HDF": 50,
  },
  finish: {
    "Generic Laminate": 0,
    "Greenlam": 100,
    "Merino": 100,
    "Century Laminate": 100,
    "Duco": 150,
    "PU": 250,
    "Acrylic": 200,
    "Veneer": 300,
    "Fluted Panel": 200,
    "Back Painted Glass": 200,
    "CNC Finish": 200,
  },
  hardware: {
    "Nimmi": 0,
    "Ebco": 100,
    "Hettich": 150,
    "Hafele": 150,
    "Sleek": 200,
    "Blum": 200,
  },
};

export type BuildType = keyof typeof baseRates;
export type CoreMaterial = keyof typeof brandAdjustments.core;
export type FinishMaterial = keyof typeof brandAdjustments.finish;
export type HardwareBrand = keyof typeof brandAdjustments.hardware;

export function calculateRate(
  buildType: BuildType,
  coreMaterial: CoreMaterial,
  finishMaterial: FinishMaterial,
  hardwareBrand: HardwareBrand
): number {
  const baseRate = baseRates[buildType];
  const coreAdjustment = brandAdjustments.core[coreMaterial] || 0;
  const finishAdjustment = brandAdjustments.finish[finishMaterial] || 0;
  const hardwareAdjustment = brandAdjustments.hardware[hardwareBrand] || 0;

  return Math.round(baseRate + coreAdjustment + finishAdjustment + hardwareAdjustment);
}

export function calculateAmount(rate: number, area: number): number {
  return Math.round(rate * area);
}
