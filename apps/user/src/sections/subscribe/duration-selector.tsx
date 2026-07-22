"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import type React from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface DurationSelectorProps {
  quantity: number;
  unitTime?: string;
  discounts?: Array<{ quantity: number; discount: number }>;
  onChange: (value: number) => void;
  showOriginalPrice?: boolean;
  minimumQuantity?: number;
}

const DurationSelector: React.FC<DurationSelectorProps> = ({
  quantity,
  unitTime = "Month",
  discounts = [],
  onChange,
  showOriginalPrice = true,
  minimumQuantity = 1,
}) => {
  const { t } = useTranslation("subscribe");
  const handleChange = useCallback(
    (value: string) => {
      onChange(Number(value));
    },
    [onChange]
  );

  const DurationOption: React.FC<{ value: string; label: string }> = ({
    value,
    label,
  }) => (
    <div className="relative">
      <RadioGroupItem className="peer sr-only" id={value} value={value} />
      <Label
        className="relative flex h-full flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
        htmlFor={value}
      >
        {label}
      </Label>
    </div>
  );

  const currentDiscount = discounts?.find(
    (item) => item.quantity === quantity
  )?.discount;
  const discountPercentage = currentDiscount ? 100 - currentDiscount : 0;

  const availableDiscounts = discounts.filter(
    (item) => item.quantity >= minimumQuantity
  );
  const hasQuantityOne = availableDiscounts.some((item) => item.quantity === 1);

  return (
    <>
      <div className="font-semibold">
        {t("purchaseDuration", "Purchase Duration")}
      </div>
      <RadioGroup
        className="flex flex-wrap gap-3"
        onValueChange={handleChange}
        value={String(quantity)}
      >
        {minimumQuantity === 1 &&
          showOriginalPrice &&
          unitTime !== "Minute" &&
          !hasQuantityOne && (
            <DurationOption label={`1 / ${t(unitTime)}`} value="1" />
          )}
        {availableDiscounts.map((item) => (
          <DurationOption
            key={item.quantity}
            label={`${item.quantity} / ${t(unitTime)}`}
            value={String(item.quantity)}
          />
        ))}
      </RadioGroup>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          {t("discountInfo", "Discount Info")}:
        </span>
        {discountPercentage > 0 ? (
          <Badge className="h-6 text-sm" variant="destructive">
            -{discountPercentage.toFixed(2)}% {t("discount", "Discount")}
          </Badge>
        ) : (
          <span className="h-6 text-muted-foreground text-sm">--</span>
        )}
      </div>
    </>
  );
};

export default DurationSelector;
