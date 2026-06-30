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
  DEFAULT_SUBSCRIPTION_PROTOCOL_OPTIONS,
  getEnabledSubscriptionProtocolOptions,
  normalizeProtocolSelectorStyle,
  normalizeSubscriptionProtocol,
  normalizeSubscriptionProtocolOptions,
  PROTOCOL_SELECTOR_STYLES,
  type SubscriptionProtocolOption,
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
  default_protocol: z.string().optional(),
  recommended_protocol: z.string().optional(),
  selector_style: z.enum(PROTOCOL_SELECTOR_STYLES).optional(),
  protocol_options: z
    .array(
      z.object({
        value: z.string().trim().min(1),
        label: z.string().trim().min(1),
        description: z.string().optional(),
        icon: z.string().optional(),
        enabled: z.boolean().optional(),
      })
    )
    .min(1)
    .optional(),
  user_agent_limit: z.boolean().optional(),
  user_agent_list: z.string().optional(),
  show_tutorial: z.boolean().optional(),
});

type SubscribeConfigFormData = z.infer<typeof subscribeConfigSchema>;

function createProtocolOption(index: number): SubscriptionProtocolOption {
  return {
    value: `protocol-${index + 1}`,
    label: `Protocol ${index + 1}`,
    description: "",
    icon: "mdi:connection",
    enabled: true,
  };
}

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
      default_protocol: "tuic",
      recommended_protocol: "tuic",
      selector_style: "cards",
      protocol_options: normalizeSubscriptionProtocolOptions(
        DEFAULT_SUBSCRIPTION_PROTOCOL_OPTIONS
      ),
      user_agent_limit: false,
      user_agent_list: "",
      show_tutorial: true,
    },
  });

  const protocolOptions = normalizeSubscriptionProtocolOptions(
    form.watch("protocol_options")
  );
  const enabledProtocolOptions =
    getEnabledSubscriptionProtocolOptions(protocolOptions);

  useEffect(() => {
    if (data) {
      const protocolOptions = normalizeSubscriptionProtocolOptions(
        data.protocol_options
      );

      form.reset({
        ...data,
        protocol_options: protocolOptions,
        default_protocol: normalizeSubscriptionProtocol(
          data.default_protocol,
          protocolOptions
        ),
        recommended_protocol: normalizeSubscriptionProtocol(
          data.recommended_protocol,
          protocolOptions
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
        protocol_options,
        ...subscribeConfig
      } = values;
      const normalizedProtocolOptions =
        normalizeSubscriptionProtocolOptions(protocol_options);

      await updateSubscribeConfig(subscribeConfig as API.SubscribeConfig);
      await updateProtocolConfig({
        default_protocol: normalizeSubscriptionProtocol(
          default_protocol,
          normalizedProtocolOptions
        ),
        recommended_protocol: normalizeSubscriptionProtocol(
          recommended_protocol,
          normalizedProtocolOptions
        ),
        selector_style,
        protocol_options: normalizedProtocolOptions,
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
                      value={
                        field.value || enabledProtocolOptions[0]?.value || ""
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {enabledProtocolOptions.map((protocol) => (
                          <SelectItem
                            key={protocol.value}
                            value={protocol.value}
                          >
                            {protocol.label}
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
                      value={
                        field.value || enabledProtocolOptions[0]?.value || ""
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {enabledProtocolOptions.map((protocol) => (
                          <SelectItem
                            key={protocol.value}
                            value={protocol.value}
                          >
                            {protocol.label}
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
                name="protocol_options"
                render={({ field }) => {
                  const options =
                    field.value && field.value.length > 0
                      ? field.value
                      : normalizeSubscriptionProtocolOptions(
                          DEFAULT_SUBSCRIPTION_PROTOCOL_OPTIONS
                        );

                  const updateOption = (
                    index: number,
                    next: Partial<SubscriptionProtocolOption>
                  ) => {
                    const nextOptions = options.map((option, optionIndex) =>
                      optionIndex === index ? { ...option, ...next } : option
                    );
                    field.onChange(nextOptions);

                    const enabledOptions =
                      getEnabledSubscriptionProtocolOptions(nextOptions);
                    const enabledValues = enabledOptions.map(
                      (option) => option.value
                    );
                    const defaultProtocol =
                      form.getValues("default_protocol") || "";
                    const recommendedProtocol =
                      form.getValues("recommended_protocol") || "";

                    if (!enabledValues.includes(defaultProtocol)) {
                      form.setValue(
                        "default_protocol",
                        enabledOptions[0]?.value || ""
                      );
                    }
                    if (!enabledValues.includes(recommendedProtocol)) {
                      form.setValue(
                        "recommended_protocol",
                        enabledOptions[0]?.value || ""
                      );
                    }
                  };

                  const removeOption = (index: number) => {
                    const nextOptions = options.filter(
                      (_option, optionIndex) => optionIndex !== index
                    );
                    const normalizedOptions =
                      normalizeSubscriptionProtocolOptions(nextOptions);
                    field.onChange(normalizedOptions);

                    const enabledOptions =
                      getEnabledSubscriptionProtocolOptions(normalizedOptions);
                    form.setValue(
                      "default_protocol",
                      normalizeSubscriptionProtocol(
                        form.getValues("default_protocol"),
                        normalizedOptions
                      )
                    );
                    form.setValue(
                      "recommended_protocol",
                      normalizeSubscriptionProtocol(
                        form.getValues("recommended_protocol"),
                        normalizedOptions
                      )
                    );
                    if (enabledOptions.length === 0) {
                      form.setValue("default_protocol", "");
                      form.setValue("recommended_protocol", "");
                    }
                  };

                  return (
                    <FormItem>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <FormLabel>
                            {t("config.protocolOptions", "Protocol Options")}
                          </FormLabel>
                          <FormDescription>
                            {t(
                              "config.protocolOptionsDescription",
                              "Configure the protocol parameter, display name, and description shown on the user dashboard"
                            )}
                          </FormDescription>
                        </div>
                        <Button
                          onClick={() =>
                            field.onChange([
                              ...options,
                              createProtocolOption(options.length),
                            ])
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Icon icon="mdi:plus" />
                          {t("actions.add", "Add")}
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {options.map((option, index) => (
                          <div
                            className="rounded-md border bg-background/60 p-3"
                            key={`${option.value}-${index}`}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={option.enabled !== false}
                                  onCheckedChange={(checked) =>
                                    updateOption(index, { enabled: checked })
                                  }
                                />
                                <span className="font-medium text-sm">
                                  {option.label || option.value}
                                </span>
                              </div>
                              <Button
                                disabled={options.length <= 1}
                                onClick={() => removeOption(index)}
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <Icon icon="mdi:trash-can-outline" />
                              </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <EnhancedInput
                                onValueChange={(value) =>
                                  updateOption(index, { value })
                                }
                                placeholder={t(
                                  "config.protocolValuePlaceholder",
                                  "protocol value, e.g. tuic"
                                )}
                                value={option.value}
                              />
                              <EnhancedInput
                                onValueChange={(value) =>
                                  updateOption(index, { label: value })
                                }
                                placeholder={t(
                                  "config.protocolLabelPlaceholder",
                                  "Display name"
                                )}
                                value={option.label}
                              />
                              <EnhancedInput
                                onValueChange={(value) =>
                                  updateOption(index, { icon: value })
                                }
                                placeholder={t(
                                  "config.protocolIconPlaceholder",
                                  "Icon, e.g. mdi:connection"
                                )}
                                value={option.icon}
                              />
                              <EnhancedInput
                                onValueChange={(value) =>
                                  updateOption(index, { description: value })
                                }
                                placeholder={t(
                                  "config.protocolDescriptionPlaceholder",
                                  "Description below the protocol name"
                                )}
                                value={option.description}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
