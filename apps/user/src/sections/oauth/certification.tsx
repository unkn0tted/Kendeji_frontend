"use client";

import { useRouter, useSearch } from "@tanstack/react-router";
import { oAuthLoginGetToken } from "@workspace/ui/services/common/oauth";
import { useEffect, useRef } from "react";
import { getRedirectUrl, setAuthorization } from "@/utils/common";

interface CertificationProps {
  platform: string;
  children: React.ReactNode;
}

export default function Certification({
  platform,
  children,
}: CertificationProps) {
  const router = useRouter();
  const searchParams = useSearch({ strict: false });
  // OAuth codes are single-use: a second exchange (e.g. StrictMode re-running
  // the effect) would fail and bounce the freshly logged-in user back to /auth.
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    let succeeded = false;
    const inviteCode = localStorage.getItem("invite") || "";
    oAuthLoginGetToken({
      method: platform,
      callback: searchParams as Record<string, string>,
      ...(inviteCode && { invite: inviteCode }),
    } as API.OAuthLoginGetTokenRequest)
      .then((res) => {
        const token = res?.data?.data?.token;
        if (!token) {
          throw new Error("Invalid token");
        }
        setAuthorization(token);
        succeeded = true;
        router.navigate({ to: getRedirectUrl() });
      })
      .catch(() => {
        if (!succeeded) {
          router.navigate({ to: "/auth" });
        }
      });
  }, [platform, router, searchParams]);

  return children;
}
