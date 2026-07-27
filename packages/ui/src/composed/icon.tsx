"use client";

import { addCollection, Icon as Iconify, type IconProps } from "@iconify/react";
import { collections } from "./icon-collections.js";

// Register offline subsets of every icon collection referenced by the apps
// (generated via `bun run icons:generate` in packages/ui) so icons render
// without runtime requests to api.iconify.design. The full flagpack
// collection is registered by area-code-select, its only consumer.
for (const collection of collections) {
  addCollection(collection);
}

export function Icon(props: IconProps) {
  return <Iconify {...props} />;
}
