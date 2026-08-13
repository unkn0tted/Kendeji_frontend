export type ProductShowcaseMode = "landing" | "purchasing";

const presentationByMode = {
  landing: {
    hideBelowSm: true,
    revealOnScroll: true,
  },
  purchasing: {
    hideBelowSm: false,
    revealOnScroll: false,
  },
} as const;

export function getProductShowcasePresentation(mode: ProductShowcaseMode) {
  return presentationByMode[mode];
}
