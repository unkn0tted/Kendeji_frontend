"use client";

import { Button } from "@workspace/ui/components/button";
import {
  sendEmailCode,
  sendSmsCode,
} from "@workspace/ui/services/common/common";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCommon } from "@/stores/global";

interface SendCodeProps {
  type: "email" | "phone";
  disabled?: boolean;
  params: {
    email?: string;
    type?: 1 | 2;
    telephone_area_code?: string;
    telephone?: string;
  };
}
export default function SendCode({
  type,
  params,
  disabled: disabledProp,
}: SendCodeProps) {
  const { t } = useTranslation("auth");
  const common = useCommon();
  const { verify_code_interval } = common.verify_code;
  const [targetDate, setTargetDate] = useState<number>();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const storedEndTime = localStorage.getItem(`verify_code_${type}`);
    if (storedEndTime) {
      const endTime = Number.parseInt(storedEndTime, 10);
      if (endTime > Date.now()) {
        setTargetDate(endTime);
      } else {
        localStorage.removeItem(`verify_code_${type}`);
      }
    }
  }, [type]);

  useEffect(() => {
    if (!targetDate) {
      setSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetDate - now) / 1000));
      setSeconds(remaining);

      if (remaining === 0) {
        setTargetDate(undefined);
        localStorage.removeItem(`verify_code_${type}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, type]);

  const setCodeTimer = () => {
    const endTime = Date.now() + verify_code_interval * 1000;
    setTargetDate(endTime);
    localStorage.setItem(`verify_code_${type}`, endTime.toString());
  };

  const getEmailCode = async () => {
    if (params.email && params.type) {
      await sendEmailCode({
        email: params.email,
        type: params.type,
      });
      setCodeTimer();
    }
  };

  const getPhoneCode = async () => {
    if (params.telephone && params.telephone_area_code && params.type) {
      await sendSmsCode({
        telephone: params.telephone,
        telephone_area_code: params.telephone_area_code,
        type: params.type,
      });
      setCodeTimer();
    }
  };

  const handleSendCode = async () => {
    try {
      if (type === "email") {
        await getEmailCode();
      } else {
        await getPhoneCode();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          t("common.error", "An error occurred")
      );
    }
  };
  const isDisabled =
    disabledProp ||
    seconds > 0 ||
    (type === "email"
      ? !params.email
      : !(params.telephone && params.telephone_area_code));

  return (
    <Button disabled={isDisabled} onClick={handleSendCode} type="button">
      {seconds > 0 ? `${seconds}s` : t("get", "Get Code")}
    </Button>
  );
}
