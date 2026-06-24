import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import { getClient } from "@workspace/ui/services/common/common";
import { querySubscribeList } from "@workspace/ui/services/user/subscribe";
import {
  queryUserSubscribe,
  resetUserSubscribeToken,
} from "@workspace/ui/services/user/user";
import { differenceInDays, formatDate } from "@workspace/ui/utils/formatting";
import { isBrowser } from "@workspace/ui/utils/index";
import {
  getSubscriptionProtocolLabel,
  normalizeProtocolSelectorStyle,
  normalizeSubscriptionProtocol,
  type SubscriptionProtocol,
} from "@workspace/ui/utils/subscription-protocol";
import { QRCodeCanvas } from "qrcode.react";
import React, { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Display } from "@/components/display";
import { useGlobalStore } from "@/stores/global";
import { getPlatform } from "@/utils/common";
import { isSubscribeSellable } from "@/utils/subscribe";
import Subscribe from "../../subscribe";
import Renewal from "../../subscribe/renewal";
import ResetTraffic from "../../subscribe/reset-traffic";
import Unsubscribe from "../../subscribe/unsubscribe";

const platforms: (keyof API.DownloadLink)[] = [
  "windows",
  "mac",
  "linux",
  "ios",
  "android",
  "harmony",
];

const protocolOptions: Array<{
  value: SubscriptionProtocol;
  label: string;
  icon: string;
  descriptionKey: string;
  descriptionDefault: string;
}> = [
  {
    value: "vless",
    label: "VLESS",
    icon: "mdi:rocket-launch-outline",
    descriptionKey: "protocolSelectorVlessDescription",
    descriptionDefault: "Default recommended protocol",
  },
  {
    value: "anytls",
    label: "AnyTLS",
    icon: "mdi:shield-lock-outline",
    descriptionKey: "protocolSelectorAnytlsDescription",
    descriptionDefault: "Only get AnyTLS nodes",
  },
];

export default function Content() {
  const { t, i18n } = useTranslation("dashboard");
  const { common, getUserSubscribe, getAppSubLink } = useGlobalStore();

  const defaultProtocol = normalizeSubscriptionProtocol(
    common.subscribe?.default_protocol
  );
  const recommendedProtocol = normalizeSubscriptionProtocol(
    common.subscribe?.recommended_protocol
  );
  const selectorStyle = normalizeProtocolSelectorStyle(
    common.subscribe?.selector_style
  );
  const [protocol, setProtocol] =
    useState<SubscriptionProtocol>(defaultProtocol);
  const [manualProtocolSelected, setManualProtocolSelected] = useState(false);

  React.useEffect(() => {
    if (!manualProtocolSelected) {
      setProtocol(defaultProtocol);
    }
  }, [defaultProtocol, manualProtocolSelected]);

  const {
    data: userSubscribe = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["queryUserSubscribe"],
    queryFn: async () => {
      const { data } = await queryUserSubscribe();
      return data.data?.list || [];
    },
  });
  const { data: subscribeList = [] } = useQuery({
    queryKey: ["querySubscribeList", i18n.language],
    queryFn: async () => {
      const { data } = await querySubscribeList(
        { language: i18n.language },
        { skipErrorHandler: true }
      );
      return data.data?.list || [];
    },
  });
  const subscribeById = new Map(subscribeList.map((item) => [item.id, item]));
  const { data: applications } = useQuery({
    queryKey: ["getClient"],
    queryFn: async () => {
      const { data } = await getClient();
      return data.data?.list || [];
    },
  });

  const availablePlatforms = React.useMemo(() => {
    if (!applications || applications.length === 0) return platforms;

    const platformsSet = new Set<keyof API.DownloadLink>();

    applications.forEach((app) => {
      if (app.download_link) {
        platforms.forEach((platform) => {
          if (app.download_link?.[platform]) {
            platformsSet.add(platform);
          }
        });
      }
    });

    return platforms.filter((platform) => platformsSet.has(platform));
  }, [applications]);

  const [platform, setPlatform] = useState<keyof API.DownloadLink>(() => {
    const detectedPlatform =
      getPlatform() === "macos"
        ? "mac"
        : (getPlatform() as keyof API.DownloadLink);
    return detectedPlatform;
  });

  React.useEffect(() => {
    if (
      availablePlatforms.length > 0 &&
      !availablePlatforms.includes(platform)
    ) {
      const firstAvailablePlatform = availablePlatforms[0];
      if (firstAvailablePlatform) {
        setPlatform(firstAvailablePlatform);
      }
    }
  }, [availablePlatforms, platform]);

  const statusWatermarks = {
    2: t("finished", "Finished"),
    3: t("expired", "Expired"),
    4: t("deducted", "Deducted"),
  };

  const selectProtocol = (value: SubscriptionProtocol) => {
    setManualProtocolSelected(true);
    setProtocol(value);
  };

  const getProtocolDescription = (option: (typeof protocolOptions)[number]) =>
    t(
      option.value === recommendedProtocol
        ? "protocolSelectorRecommendedDescription"
        : option.descriptionKey,
      option.value === recommendedProtocol
        ? "Recommended protocol"
        : option.descriptionDefault
    );

  return (
    <>
      {userSubscribe.length ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-semibold">
              <Icon className="size-5" icon="uil:servers" />
              {t("mySubscriptions", "My Subscriptions")}
            </h2>
            <div className="flex gap-2">
              <Button
                className={isLoading ? "animate-pulse" : ""}
                onClick={() => {
                  refetch();
                }}
                size="sm"
                variant="outline"
              >
                <Icon icon="uil:sync" />
              </Button>
              <Button asChild size="sm">
                <Link to="/subscribe">
                  {t("purchaseSubscription", "Purchase Subscription")}
                </Link>
              </Button>
            </div>
          </div>
          <div className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-card/88 p-5 shadow-primary/10 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-primary/20 shadow-sm">
                      <Icon className="size-5" icon="mdi:tune-variant" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">
                        {t("protocolSelectorTitle", "Subscription Protocol")}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {t(
                          "protocolSelectorDescription",
                          "Copy links, import links, and QR codes will follow the selected protocol."
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex w-fit rounded-md border border-primary/15 bg-background/85 px-3 py-1 font-medium text-primary text-xs">
                    {t("protocolSelectorDefault", "Default: {{protocol}}", {
                      protocol: getSubscriptionProtocolLabel(defaultProtocol),
                    })}
                  </span>
                </div>

                {selectorStyle === "compact" ? (
                  <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:min-w-[360px] lg:justify-end">
                    {protocolOptions.map((option) => {
                      const isActive = protocol === option.value;

                      return (
                        <button
                          aria-label={`${option.label}: ${getProtocolDescription(option)}`}
                          aria-pressed={isActive}
                          className={cn(
                            "inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded-md border px-4 font-semibold text-sm transition-all",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground shadow-primary/20 shadow-sm"
                              : "border-border/70 bg-background/85 text-foreground hover:border-primary/35 hover:bg-background"
                          )}
                          key={option.value}
                          onClick={() => selectProtocol(option.value)}
                          title={getProtocolDescription(option)}
                          type="button"
                        >
                          <Icon className="size-4" icon={option.icon} />
                          <span>{option.label}</span>
                          {option.value === recommendedProtocol && (
                            <span
                              className={cn(
                                "rounded-sm px-1.5 py-0.5 font-medium text-[10px]",
                                isActive
                                  ? "bg-primary-foreground/15 text-primary-foreground"
                                  : "bg-primary/10 text-primary"
                              )}
                            >
                              {t("protocolSelectorRecommendedTag", "REC")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
                    {protocolOptions.map((option) => {
                      const isActive = protocol === option.value;

                      return (
                        <button
                          aria-pressed={isActive}
                          className={cn(
                            "rounded-md border px-4 py-3 text-left transition-all",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                              : "border-border/70 bg-background/85 hover:border-primary/35 hover:bg-background"
                          )}
                          key={option.value}
                          onClick={() => selectProtocol(option.value)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 flex size-9 items-center justify-center rounded-md transition-colors",
                                  isActive
                                    ? "bg-primary-foreground/15 text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                                )}
                              >
                                <Icon className="size-5" icon={option.icon} />
                              </div>
                              <div>
                                <p className="font-semibold text-sm uppercase tracking-[0.18em]">
                                  {option.label}
                                </p>
                                <p
                                  className={cn(
                                    "mt-1 text-xs",
                                    isActive
                                      ? "text-primary-foreground/80"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {getProtocolDescription(option)}
                                </p>
                              </div>
                            </div>
                            <Icon
                              className={cn(
                                "mt-1 size-5 transition-opacity",
                                isActive ? "opacity-100" : "opacity-20"
                              )}
                              icon={
                                isActive
                                  ? "mdi:check-circle"
                                  : "mdi:circle-outline"
                              }
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {availablePlatforms.length > 0 && (
              <div className="flex flex-wrap justify-between gap-4">
                <Tabs
                  className="w-full max-w-full md:w-auto"
                  onValueChange={(value) =>
                    setPlatform(value as keyof API.DownloadLink)
                  }
                  value={platform}
                >
                  <TabsList className="flex *:flex-auto">
                    {availablePlatforms.map((item) => (
                      <TabsTrigger
                        className="px-1 lg:px-3"
                        key={item}
                        value={item}
                      >
                        <Icon
                          className="size-5"
                          icon={`${
                            {
                              windows: "mdi:microsoft-windows",
                              mac: "uil:apple",
                              linux: "uil:linux",
                              ios: "simple-icons:ios",
                              android: "uil:android",
                              harmony: "simple-icons:harmonyos",
                            }[item]
                          }`}
                        />
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
          {userSubscribe.map((item) => {
            // 如果过期时间为0，说明是永久订阅，不应该显示过期状态
            const isActuallyExpired =
              item.status === 3 && item.expire_time !== 0;
            const shouldShowWatermark =
              item.status === 2 || item.status === 4 || isActuallyExpired;
            const currentSubscribe = subscribeById.get(item.subscribe_id);

            return (
              <Card
                className={cn("dashboard-subscription-card relative", {
                  "relative opacity-80 grayscale": isActuallyExpired,
                  "relative hidden opacity-60 blur-[0.3px] grayscale":
                    item.status === 4,
                })}
                key={item.id}
              >
                {shouldShowWatermark && (
                  <div
                    className={cn(
                      "pointer-events-none absolute top-0 left-0 z-10 h-full w-full overflow-hidden mix-blend-difference brightness-150 contrast-200 invert-[0.2]",
                      {
                        "text-destructive": item.status === 2,
                        "text-white": isActuallyExpired || item.status === 4,
                      }
                    )}
                  >
                    <div className="absolute inset-0">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const row = Math.floor(i / 4);
                        const col = i % 4;
                        const top = 10 + row * 25 + (col % 2 === 0 ? 5 : -5);
                        const left = 5 + col * 30 + (row % 2 === 0 ? 0 : 10);

                        return (
                          <span
                            className="absolute rotate-[-30deg] whitespace-nowrap font-black text-lg opacity-40 shadow-[0px_0px_1px_rgba(255,255,255,0.5)]"
                            key={i}
                            style={{
                              top: `${top}%`,
                              left: `${left}%`,
                            }}
                          >
                            {
                              statusWatermarks[
                                item.status as keyof typeof statusWatermarks
                              ]
                            }
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                  <CardTitle className="flex min-w-0 flex-1 flex-col gap-2">
                    <span
                      className="dashboard-subscription-name"
                      title={item.subscribe.name}
                    >
                      <span className="dashboard-subscription-name__text font-display">
                        {item.subscribe.name}
                      </span>
                    </span>
                    <p className="pl-0.5 text-foreground/55 text-sm">
                      {t("expireAt", "Expires At")}:{" "}
                      {item.expire_time
                        ? formatDate(item.expire_time)
                        : t("noLimit", "No Limit")}
                    </p>
                  </CardTitle>
                  {item.status !== 4 && (
                    <div className="flex flex-wrap gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            {t("resetSubscription", "Reset Subscription")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("prompt", "Prompt")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t(
                                "confirmResetSubscription",
                                "Are you sure you want to reset your subscription?"
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t("cancel", "Cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await resetUserSubscribeToken({
                                  user_subscribe_id: item.id,
                                });
                                await refetch();
                                toast.success(
                                  t("resetSuccess", "Reset Success")
                                );
                              }}
                            >
                              {t("confirm", "Confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ResetTraffic
                        id={item.id}
                        replacement={item.subscribe.replacement}
                      />
                      {item.expire_time !== 0 &&
                        currentSubscribe &&
                        isSubscribeSellable(currentSubscribe) && (
                          <Renewal id={item.id} subscribe={currentSubscribe} />
                        )}
                      <Unsubscribe
                        allowDeduction={item.subscribe.allow_deduction}
                        id={item.id}
                        onSuccess={refetch}
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-2 gap-4 *:flex *:flex-col *:justify-between lg:grid-cols-4">
                    <li>
                      <span className="text-muted-foreground">
                        {t("used", "Used")}
                      </span>
                      <span className="font-bold text-2xl">
                        <Display
                          type="traffic"
                          unlimited={!item.traffic}
                          value={item.upload + item.download}
                        />
                      </span>
                    </li>
                    <li>
                      <span className="text-muted-foreground">
                        {t("totalTraffic", "Total Traffic")}
                      </span>
                      <span className="font-bold text-2xl">
                        <Display
                          type="traffic"
                          unlimited={!item.traffic}
                          value={item.traffic}
                        />
                      </span>
                    </li>
                    <li>
                      <span className="text-muted-foreground">
                        {t("nextResetDays", "Next Reset Days")}
                      </span>
                      <span className="font-semibold text-2xl">
                        {item.reset_time
                          ? differenceInDays(
                              new Date(item.reset_time),
                              new Date()
                            )
                          : t("noReset", "No Reset")}
                      </span>
                    </li>
                    <li>
                      <span className="text-muted-foreground">
                        {t("expirationDays", "Expiration Days")}
                      </span>
                      <span className="font-semibold text-2xl">
                        {}
                        {item.expire_time
                          ? differenceInDays(
                              new Date(item.expire_time),
                              new Date()
                            ) || t("unknown", "Unknown")
                          : t("noLimit", "No Limit")}
                      </span>
                    </li>
                  </ul>
                  <Separator className="mt-6" />
                  <Accordion
                    className="w-full"
                    collapsible
                    defaultValue="0"
                    type="single"
                  >
                    {getUserSubscribe(item.short, item.token, protocol)?.map(
                      (url, index) => (
                        <AccordionItem key={url} value={String(index)}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex w-full flex-row items-center justify-between">
                              <CardTitle className="font-medium text-sm">
                                <span className="sr-only">
                                  {t("subscriptionUrl", "Subscription URL")}{" "}
                                  {index + 1}
                                </span>
                              </CardTitle>

                              <CopyToClipboard
                                onCopy={(_, result) => {
                                  if (result) {
                                    toast.success(
                                      t("copySuccess", "Copy Success")
                                    );
                                  }
                                }}
                                text={url}
                              >
                                <span
                                  className="mr-4 flex cursor-pointer rounded p-2 text-primary text-sm hover:bg-accent"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Icon
                                    className="mr-2 size-5"
                                    icon="uil:copy"
                                  />
                                  {t("copy", "Copy")}
                                </span>
                              </CopyToClipboard>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                              {applications
                                ?.filter(
                                  (application) =>
                                    !!(
                                      application.download_link?.[platform] &&
                                      application.scheme
                                    )
                                )
                                .map((application) => {
                                  const downloadUrl =
                                    application.download_link?.[platform];

                                  const handleCopy = (
                                    _: string,
                                    result: boolean
                                  ) => {
                                    if (result) {
                                      const href = getAppSubLink(
                                        url,
                                        application.scheme
                                      );
                                      const showSuccessMessage = () => {
                                        toast.success(
                                          <>
                                            <p>
                                              {t("copySuccess", "Copy Success")}
                                            </p>
                                            <br />
                                            <p>
                                              {t(
                                                "manualImportMessage",
                                                "Please import manually"
                                              )}
                                            </p>
                                          </>
                                        );
                                      };

                                      if (isBrowser() && href) {
                                        window.location.href = href;
                                        const checkRedirect = setTimeout(() => {
                                          if (window.location.href !== href) {
                                            showSuccessMessage();
                                          }
                                          clearTimeout(checkRedirect);
                                        }, 1000);
                                        return;
                                      }

                                      showSuccessMessage();
                                    }
                                  };

                                  return (
                                    <div
                                      className="flex size-full flex-col items-center justify-between gap-2 text-muted-foreground text-xs"
                                      key={application.name}
                                    >
                                      <span>{application.name}</span>

                                      {application.icon && (
                                        <img
                                          alt={application.name}
                                          className="p-1"
                                          height={64}
                                          src={application.icon}
                                          width={64}
                                        />
                                      )}
                                      <div className="flex">
                                        {downloadUrl && (
                                          <Button
                                            asChild
                                            className={
                                              application.scheme
                                                ? "rounded-r-none px-1.5"
                                                : "px-1.5"
                                            }
                                            size="sm"
                                            variant="secondary"
                                          >
                                            <a
                                              href={downloadUrl}
                                              rel="noopener noreferrer"
                                              target="_blank"
                                            >
                                              {t("download", "Download")}
                                            </a>
                                          </Button>
                                        )}

                                        {application.scheme && (
                                          <CopyToClipboard
                                            onCopy={handleCopy}
                                            text={getAppSubLink(
                                              url,
                                              application.scheme
                                            )}
                                          >
                                            <Button
                                              className={
                                                downloadUrl
                                                  ? "rounded-l-none p-2"
                                                  : "p-2"
                                              }
                                              size="sm"
                                            >
                                              {t("import", "Import")}
                                            </Button>
                                          </CopyToClipboard>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              <div className="hidden size-full flex-col items-center justify-between gap-2 text-muted-foreground text-sm lg:flex">
                                <span>{t("qrCode", "QR Code")}</span>
                                <QRCodeCanvas
                                  bgColor="transparent"
                                  fgColor="rgb(190, 120, 145)"
                                  size={80}
                                  value={url}
                                />
                                <span className="text-center">
                                  {t("scanToSubscribe", "Scan to Subscribe")}
                                </span>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    )}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </>
      ) : (
        <>
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Icon className="size-5" icon="uil:shop" />
            {t("purchaseSubscription", "Purchase Subscription")}
          </h2>
          <Subscribe />
        </>
      )}
    </>
  );
}
