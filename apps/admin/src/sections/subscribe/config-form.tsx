"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { EnhancedInput } from "@workspace/ui/composed/enhanced-input";
import { Icon } from "@workspace/ui/composed/icon";
import {
  getSubscribeConfig,
  updateSubscribeConfig,
} from "@workspace/ui/services/admin/system";
import {
  getProtocolConfig,
  updateProtocolConfig,
} from "@workspace/ui/services/protocol-config";
import {
  getSubscriptionProtocolLabel,
  normalizeProtocolSelectorStyle,
  normalizeSubscriptionProtocol,
  PROTOCOL_SELECTOR_STYLES,
  SUBSCRIPTION_PROTOCOLS,
} from "@workspace/ui/utils/subscription-protocol";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

const subscribeConfigSchema = z.object({
  single_model: z.boolean().optional(),
  pan_domain: z.boolean().optional(),
  subscribe_path: z.string().optional(),
  subscribe_domain: z.string().optional(),
  default_protocol: z.enum(SUBSCRIPTION_PROTOCOLS).optional(),
  recommended_protocol: z.enum(SUBSCRIPTION_PROTOCOLS).optional(),
  selector_style: z.enum(PROTOCOL_SELECTOR_STYLES).optional(),
  user_agent_limit: z.boolean().optional(),
  user_agent_list: z.string().optional(),
  show_tutorial: z.boolean().optional(),
});

type SubscribeConfigFormData = z.infer<typeof subscribeConfigSchema>;

export default function ConfigForm() {
  const { t } = useTranslation("subscribe");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["getSubscribeConfig"],
    queryFn: async () => {
      const { data } = await getSubscribeConfig();
      const subscribeConfig = data.data;

      try {
        const protocolConfigResponse = await getProtocolConfig();

        return {
          ...subscribeConfig,
          ...protocolConfigResponse.data.data,
        };
      } catch {
        return subscribeConfig;
      }
    },
    enabled: open,
  });

  const form = useForm<SubscribeConfigFormData>({
    resolver: zodResolver(subscribeConfigSchema),
    defaultValues: {
      single_model: false,
      pan_domain: false,
      subscribe_path: "",
      subscribe_domain: "",
      default_protocol: "vless",
      recommended_protocol: "vless",
      selector_style: "cards",
      user_agent_limit: false,
      user_agent_list: "",
      show_tutorial: true,
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        ...data,
        default_protocol: normalizeSubscriptionProtocol(data.default_protocol),
        recommended_protocol: normalizeSubscriptionProtocol(
          data.recommended_protocol
        ),
        selector_style: normalizeProtocolSelectorStyle(data.selector_style),
      });
    }
  }, [data, form]);

  async function onSubmit(values: SubscribeConfigFormData) {
    setLoading(true);
    try {
      const {
        default_protocol,
        recommended_protocol,
        selector_style,
        ...subscribeConfig
      } = values;

      await updateSubscribeConfig(subscribeConfig as API.SubscribeConfig);
      await updateProtocolConfig({
        default_protocol,
        recommended_protocol,
        selector_style,
      });
      toast.success(t("config.updateSuccess", "Settings updated successfully"));
      refetch();
      setOpen(false);
    } catch (_error) {
      toast.error(t("config.updateError", "Update failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <div className="flex cursor-pointer items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" icon="mdi:cog" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {t("config.title", "Subscription Configuration")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("config.description", "Manage subscription system settings")}
              </p>
            </div>
          </div>
          <Icon className="size-6" icon="mdi:chevron-right" />
        </div>
      </SheetTrigger>
      <SheetContent className="w-[600px] max-w-full md:max-w-screen-md">
        <SheetHeader>
          <SheetTitle>
            {t("config.title", "Subscription Configuration")}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100dvh-48px-36px-36px-env(safe-area-inset-top))] px-6">
          <Form {...form}>
            <form
              className="space-y-2 pt-4"
              id="subscribe-config-form"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="show_tutorial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.showTutorial", "Show Tutorial Section")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        className="!mt-0 float-end"
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "config.showTutorialDescription",
                        "Show the client tutorial section on the user document page"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="single_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(
                        "config.singleSubscriptionMode",
                        "Single Subscription Mode"
                      )}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        className="!mt-0 float-end"
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "config.singleSubscriptionModeDescription",
                        "Limit users to one active subscription. Existing subscriptions unaffected"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.defaultProtocol", "Default Protocol")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "vless"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUBSCRIPTION_PROTOCOLS.map((protocol) => (
                          <SelectItem key={protocol} value={protocol}>
                            {getSubscriptionProtocolLabel(protocol)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(
                        "config.defaultProtocolDescription",
                        "Protocol selected by default on the user dashboard and used when no protocol is specified"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recommended_protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.recommendedProtocol", "Recommended Protocol")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "vless"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUBSCRIPTION_PROTOCOLS.map((protocol) => (
                          <SelectItem key={protocol} value={protocol}>
                            {getSubscriptionProtocolLabel(protocol)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(
                        "config.recommendedProtocolDescription",
                        "Protocol marked as recommended in the user dashboard selector"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="selector_style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.protocolSelectorStyle", "Selector Style")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "cards"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROTOCOL_SELECTOR_STYLES.map((style) => (
                          <SelectItem key={style} value={style}>
                            {t(
                              `config.protocolSelectorStyleOptions.${style}`,
                              style === "cards" ? "Cards" : "Compact"
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(
                        "config.protocolSelectorStyleDescription",
                        "Display style for the user dashboard protocol selector"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pan_domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.wildcardResolution", "Wildcard Resolution")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        className="!mt-0 float-end"
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "config.wildcardResolutionDescription",
                        "Enable wildcard domain resolution for subscriptions"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subscribe_path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.subscriptionPath", "Subscription Path")}
                    </FormLabel>
                    <FormControl>
                      <EnhancedInput
                        onValueBlur={field.onChange}
                        placeholder={t(
                          "config.subscriptionPathPlaceholder",
                          "Enter subscription path"
                        )}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "config.subscriptionPathDescription",
                        "Custom path for subscription endpoints (better performance after system restart)"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subscribe_domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.subscriptionDomain", "Subscription Domain")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-32"
                        placeholder={`${t(
                          "config.subscriptionDomainPlaceholder",
                          "Enter subscription domain, one per line"
                        )}\nexample.com\nwww.example.com`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "config.subscriptionDomainDescription",
                        "Custom domain for subscription links"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user_agent_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.userAgentLimit", "{{userAgent}} Restriction", {
                        userAgent: "User-Agent",
                      })}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        className="!mt-0 float-end"
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "config.userAgentLimitDescription",
                        "Enable access restrictions based on {{userAgent}}",
                        {
                          userAgent: "User-Agent",
                        }
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user_agent_list"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("config.userAgentList", "{{userAgent}} Whitelist", {
                        userAgent: "User-Agent",
                      })}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-32"
                        placeholder={`${t(
                          "config.userAgentListPlaceholder",
                          "Enter allowed {{userAgent}}, one per line",
                          { userAgent: "User-Agent" }
                        )}\nClashX\nClashForAndroid\nClash-verge`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "config.userAgentListDescription",
                        "Allowed {{userAgent}} for subscription access, one per line. Configured application {{userAgent}} will be automatically included",
                        {
                          userAgent: "User-Agent",
                        }
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <SheetFooter className="flex-row justify-end gap-2 pt-3">
          <Button
            disabled={loading}
            onClick={() => setOpen(false)}
            variant="outline"
          >
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button disabled={loading} form="subscribe-config-form" type="submit">
            {loading && (
              <Icon className="mr-2 animate-spin" icon="mdi:loading" />
            )}
            {t("actions.save", "Save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
