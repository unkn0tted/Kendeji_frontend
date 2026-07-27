export type ParsedFeature = {
  icon: string;
  label: string;
  type: "default" | "success" | "destructive";
};

export type ParsedDescription = {
  description: string;
  features: ParsedFeature[];
};

function normalizeFeatureType(type?: string): ParsedFeature["type"] {
  if (type === "success" || type === "destructive") {
    return type;
  }

  return "default";
}

function normalizeFeature(feature: unknown): ParsedFeature | null {
  if (!feature || typeof feature !== "object") {
    return null;
  }

  const partialFeature = feature as Partial<ParsedFeature>;
  const label =
    typeof partialFeature.label === "string" ? partialFeature.label : "";

  if (!label) {
    return null;
  }

  return {
    icon: typeof partialFeature.icon === "string" ? partialFeature.icon : "",
    label,
    type: normalizeFeatureType(partialFeature.type),
  };
}

export function parseDescription(rawDescription?: string): ParsedDescription {
  if (!rawDescription) {
    return { description: "", features: [] };
  }

  try {
    const parsed = JSON.parse(rawDescription) as Partial<ParsedDescription>;

    return {
      description:
        typeof parsed.description === "string" ? parsed.description : "",
      features: Array.isArray(parsed.features)
        ? parsed.features
            .map(normalizeFeature)
            .filter((feature): feature is ParsedFeature => Boolean(feature))
        : [],
    };
  } catch {
    return {
      description: rawDescription,
      features: [],
    };
  }
}
