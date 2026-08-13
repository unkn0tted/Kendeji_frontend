import { describe, expect, test } from "bun:test";
import { getProductShowcasePresentation } from "../../apps/user/src/sections/main/product-showcase/presentation";

describe("product showcase presentation", () => {
  test("keeps the landing-page-only reveal and mobile hiding scoped", () => {
    expect(getProductShowcasePresentation("landing")).toEqual({
      hideBelowSm: true,
      revealOnScroll: true,
    });
  });

  test("keeps purchasing visible without an intersection-based reveal", () => {
    expect(getProductShowcasePresentation("purchasing")).toEqual({
      hideBelowSm: false,
      revealOnScroll: false,
    });
  });
});
