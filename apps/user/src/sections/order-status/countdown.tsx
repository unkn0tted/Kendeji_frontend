"use client";

import { useCountDown } from "ahooks";
import { useTranslation } from "react-i18next";

/** Orders stay payable for this many minutes after creation. */
export const EXPIRY_MINUTES = 15;

const pad = (value: number) => value.toString().padStart(2, "0");

/**
 * mm:ss countdown to `target` (epoch ms), falling back to the shared
 * "time expired" copy once the target passes. Replaces the two hand-rolled
 * zero-pad implementations that used to live in the logged-in and guest
 * order-status pages.
 */
export function Countdown({
  target,
  onExpire,
}: {
  target?: number;
  onExpire?: () => void;
}) {
  const { t } = useTranslation("order");
  const [countdown] = useCountDown({ targetDate: target, onEnd: onExpire });

  if (countdown <= 0) {
    return <>{t("timeExpired", "Time Expired")}</>;
  }

  const totalSeconds = Math.floor(countdown / 1000);
  return (
    <span className="tabular-nums">
      {pad(Math.floor(totalSeconds / 60))} : {pad(totalSeconds % 60)}
    </span>
  );
}
