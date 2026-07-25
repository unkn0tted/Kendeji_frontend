"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { ConfirmButton } from "@workspace/ui/composed/confirm-button";
import { Icon } from "@workspace/ui/composed/icon";
import {
  createSubscriptionRewriteRule,
  deleteSubscriptionRewriteRule,
  getSubscriptionRewriteRules,
  getSubscriptionRewriterConfig,
  inspectSubscriptionRewrite,
  type SubscriptionInspection,
  type SubscriptionRewriteRule,
  updateSubscriptionRewriteRule,
} from "@workspace/ui/services/subscription-rewriter";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { parseSubscriberIds } from "./subscriber-ids";

type RuleInput = Omit<SubscriptionRewriteRule, "id">;

const emptyRule: RuleInput = {
  name: "",
  match_mode: "range",
  start_id: 0,
  end_id: 1000,
  subscriber_ids: [],
  source_host: "",
  target_host: "",
  enabled: true,
  priority: 100,
};

const explicitIdsUnsupportedMessage =
  "The subscription rewriter backend does not support explicit IDs";

export function RewriterPanel() {
  const { t } = useTranslation("subscribe");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] =
    useState<SubscriptionRewriteRule | null>(null);
  const [subscriberId, setSubscriberId] = useState("");
  const [protocol, setProtocol] = useState("anytls");
  const [userAgent, setUserAgent] = useState("");
  const [inspection, setInspection] = useState<SubscriptionInspection>();
  const [inspecting, setInspecting] = useState(false);

  const query = useQuery({
    queryKey: ["subscription-rewriter"],
    queryFn: async () => {
      const [configResponse, rulesResponse] = await Promise.all([
        getSubscriptionRewriterConfig(),
        getSubscriptionRewriteRules(),
      ]);
      return {
        config: configResponse.data.data,
        rules: rulesResponse.data.data || [],
      };
    },
  });

  const sourceHosts = useMemo(
    () => inspection?.source_hosts.map((item) => item.host) || [],
    [inspection]
  );

  async function inspect() {
    const id = Number(subscriberId);
    if (!(Number.isSafeInteger(id) && id >= 0)) {
      toast.error(
        t("rewriter.invalidSubscriberId", "Enter a valid user subscription ID")
      );
      return;
    }

    setInspecting(true);
    try {
      const response = await inspectSubscriptionRewrite({
        subscriber_id: id,
        protocol,
        user_agent: userAgent,
      });
      setInspection(response.data.data);
    } catch {
      toast.error(
        t(
          "rewriter.inspectFailed",
          "Could not inspect this subscription. Check the database and origin configuration."
        )
      );
    } finally {
      setInspecting(false);
    }
  }

  function openCreateRule() {
    setEditingRule(null);
    setRuleDialogOpen(true);
  }

  function openEditRule(rule: SubscriptionRewriteRule) {
    setEditingRule(rule);
    setRuleDialogOpen(true);
  }

  async function saveRule(values: RuleInput) {
    try {
      const response = editingRule
        ? await updateSubscriptionRewriteRule(editingRule.id, values)
        : await createSubscriptionRewriteRule(values);
      if (
        values.match_mode === "ids" &&
        response.data.data?.match_mode !== "ids"
      ) {
        throw new Error(explicitIdsUnsupportedMessage);
      }
      toast.success(t("rewriter.ruleSaved", "Rewrite rule saved"));
      setRuleDialogOpen(false);
      await query.refetch();
      if (inspection) {
        await inspect();
      }
    } catch (error) {
      toast.error(
        error instanceof Error &&
          error.message === explicitIdsUnsupportedMessage
          ? t(
              "rewriter.backendUpgradeRequired",
              "Update the subscription rewriter backend before saving explicit IDs."
            )
          : t("rewriter.ruleSaveFailed", "Failed to save rewrite rule")
      );
    }
  }

  async function deleteRule(id: string) {
    try {
      await deleteSubscriptionRewriteRule(id);
      toast.success(t("rewriter.ruleDeleted", "Rewrite rule deleted"));
      await query.refetch();
    } catch {
      toast.error(
        t("rewriter.ruleDeleteFailed", "Failed to delete rewrite rule")
      );
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {t("rewriter.title", "Subscription Domain Rewriter")}
            </CardTitle>
            <CardDescription>
              {t(
                "rewriter.description",
                "Rewrite selected node entry hostnames by subscription ID range or explicit IDs. Direct subscription links remain unchanged."
              )}
            </CardDescription>
          </div>
          <Badge variant={query.isError ? "destructive" : "secondary"}>
            {query.isError
              ? t("rewriter.unavailable", "Unavailable")
              : t("rewriter.independentService", "Independent service")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
            <ConfigValue
              label={t("rewriter.originUrl", "Origin/direct URL")}
              value={query.data?.config?.origin_base_url}
            />
            <ConfigValue
              label={t("rewriter.publicLinks", "User-facing subscription URLs")}
              value={query.data?.config?.public_base_url}
              values={query.data?.config?.public_base_urls}
            />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <h3 className="font-medium">
                {t("rewriter.inspectTitle", "Inspect current entry domains")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t(
                  "rewriter.inspectDescription",
                  "The service reads the token by subscription ID, requests the origin subscription, and returns only detected hostnames."
                )}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                min={0}
                onChange={(event) => setSubscriberId(event.target.value)}
                placeholder={t("rewriter.subscriberId", "User subscription ID")}
                type="number"
                value={subscriberId}
              />
              <Input
                onChange={(event) => setProtocol(event.target.value)}
                placeholder={t("rewriter.protocol", "Protocol (optional)")}
                value={protocol}
              />
              <Input
                onChange={(event) => setUserAgent(event.target.value)}
                placeholder={t("rewriter.userAgent", "User-Agent (optional)")}
                value={userAgent}
              />
              <Button disabled={inspecting} onClick={inspect} type="button">
                {inspecting && (
                  <Icon className="animate-spin" icon="mdi:loading" />
                )}
                {t("rewriter.inspect", "Inspect")}
              </Button>
            </div>

            {inspection && <InspectionSummary inspection={inspection} />}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">
                  {t("rewriter.rules", "Rewrite rules")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t(
                    "rewriter.rulesDescription",
                    "Only the exact source hostname is replaced. SNI and all unmatched hostnames are preserved."
                  )}
                </p>
              </div>
              <Button onClick={openCreateRule} type="button">
                <Icon icon="mdi:plus" />
                {t("rewriter.addRule", "Add rule")}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("rewriter.ruleName", "Name")}</TableHead>
                  <TableHead>
                    {t("rewriter.matchSubscribers", "Matching subscribers")}
                  </TableHead>
                  <TableHead>
                    {t("rewriter.sourceHost", "Source hostname")}
                  </TableHead>
                  <TableHead>
                    {t("rewriter.targetHost", "Target hostname")}
                  </TableHead>
                  <TableHead>{t("rewriter.priority", "Priority")}</TableHead>
                  <TableHead>{t("rewriter.status", "Status")}</TableHead>
                  <TableHead className="text-right">
                    {t("rewriter.actions", "Actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.name || "—"}</TableCell>
                    <TableCell>
                      <RuleMatchValue rule={rule} />
                    </TableCell>
                    <TableCell className="max-w-56 truncate font-mono text-xs">
                      {rule.source_host}
                    </TableCell>
                    <TableCell className="max-w-56 truncate font-mono text-xs">
                      {rule.target_host}
                    </TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? "default" : "outline"}>
                        {rule.enabled
                          ? t("rewriter.enabled", "Enabled")
                          : t("rewriter.disabled", "Disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          onClick={() => openEditRule(rule)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {t("actions.edit", "Edit")}
                        </Button>
                        <ConfirmButton
                          description={t(
                            "rewriter.deleteRuleDescription",
                            "This rule will stop applying immediately."
                          )}
                          onConfirm={() => deleteRule(rule.id)}
                          title={t(
                            "rewriter.deleteRule",
                            "Delete rewrite rule?"
                          )}
                          trigger={
                            <Button size="sm" type="button" variant="ghost">
                              {t("actions.delete", "Delete")}
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!query.isLoading && (query.data?.rules.length || 0) === 0 && (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      {t(
                        "rewriter.noRules",
                        "No rewrite rules. All subscriptions pass through unchanged."
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RuleDialog
        initialRule={editingRule}
        onOpenChange={setRuleDialogOpen}
        onSubmit={saveRule}
        open={ruleDialogOpen}
        sourceHosts={sourceHosts}
      />
    </>
  );
}

function RuleMatchValue({ rule }: { rule: SubscriptionRewriteRule }) {
  const { t } = useTranslation("subscribe");
  if (rule.match_mode !== "ids") {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Badge variant="outline">{t("rewriter.rangeMode", "Range")}</Badge>
        <span className="font-mono text-xs">
          {rule.start_id}–{rule.end_id}
        </span>
      </div>
    );
  }

  const subscriberIds = rule.subscriber_ids || [];
  const visibleIds = subscriberIds.slice(0, 8);
  const hiddenCount = subscriberIds.length - visibleIds.length;
  const fullValue = subscriberIds.join(", ");

  return (
    <div
      className="flex max-w-80 items-center gap-2"
      title={fullValue || undefined}
    >
      <Badge className="shrink-0" variant="outline">
        {t("rewriter.idsMode", "Explicit IDs")}
      </Badge>
      <span className="truncate font-mono text-xs">
        {visibleIds.join(", ")}
        {hiddenCount > 0 ? ` … (+${hiddenCount})` : ""}
      </span>
    </div>
  );
}

function ConfigValue({
  label,
  value,
  values,
}: {
  label: string;
  value?: string;
  values?: string[];
}) {
  const displayValues = values?.length ? values : value ? [value] : [];
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      {displayValues.length ? (
        displayValues.map((displayValue) => (
          <p className="truncate font-mono text-sm" key={displayValue}>
            {displayValue}
          </p>
        ))
      ) : (
        <p className="font-mono text-sm">—</p>
      )}
    </div>
  );
}

function InspectionSummary({
  inspection,
}: {
  inspection: SubscriptionInspection;
}) {
  const { t } = useTranslation("subscribe");
  return (
    <div className="space-y-3 rounded-md bg-muted/40 p-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          {t("rewriter.format", "Format")}:{" "}
          {inspection.wrapped === "base64"
            ? `Base64 → ${inspection.format}`
            : inspection.format}
        </Badge>
        <Badge variant="outline">
          {t("rewriter.replacements", "Replacements")}:{" "}
          {inspection.replacements}
        </Badge>
      </div>
      <HostMappings inspection={inspection} />
    </div>
  );
}

function HostMappings({ inspection }: { inspection: SubscriptionInspection }) {
  const { t } = useTranslation("subscribe");
  const mappings = inspection.host_mappings || [];

  if (mappings.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <HostList
          hosts={inspection.source_hosts}
          title={t("rewriter.originalHosts", "Original entry hostnames")}
        />
        <HostList
          hosts={inspection.result_hosts}
          title={t("rewriter.resultHosts", "Result entry hostnames")}
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {t("rewriter.originalHosts", "Original entry hostname")}
            </TableHead>
            <TableHead className="w-8 text-center">→</TableHead>
            <TableHead>
              {t("rewriter.resultHosts", "Result entry hostname")}
            </TableHead>
            <TableHead className="w-20 text-right">
              {t("rewriter.occurrences", "Count")}
            </TableHead>
            <TableHead className="w-24 text-right">
              {t("rewriter.mappingStatus", "Status")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map((mapping) => (
            <TableRow
              key={`${mapping.source_host}\u0000${mapping.result_host}`}
            >
              <TableCell className="whitespace-normal break-all font-mono text-xs">
                {mapping.source_host}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                →
              </TableCell>
              <TableCell className="whitespace-normal break-all font-mono text-xs">
                {mapping.result_host}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {mapping.count}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={mapping.rewritten ? "default" : "secondary"}>
                  {mapping.rewritten
                    ? t("rewriter.rewritten", "Rewritten")
                    : t("rewriter.unchanged", "Unchanged")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function HostList({
  title,
  hosts,
}: {
  title: string;
  hosts: Array<{ host: string; count: number }>;
}) {
  return (
    <div>
      <p className="mb-1 font-medium text-xs">{title}</p>
      <div className="space-y-1">
        {hosts.map((host) => (
          <div
            className="flex items-center justify-between gap-3 font-mono text-xs"
            key={host.host}
          >
            <span className="truncate">{host.host}</span>
            <Badge variant="secondary">{host.count}</Badge>
          </div>
        ))}
        {hosts.length === 0 && (
          <p className="text-muted-foreground text-xs">—</p>
        )}
      </div>
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  initialRule,
  sourceHosts,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRule: SubscriptionRewriteRule | null;
  sourceHosts: string[];
  onSubmit: (values: RuleInput) => Promise<void>;
}) {
  const { t } = useTranslation("subscribe");
  const [values, setValues] = useState<RuleInput>(emptyRule);
  const [subscriberIdsText, setSubscriberIdsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const matchMode = initialRule?.match_mode === "ids" ? "ids" : "range";
      const subscriberIds = initialRule?.subscriber_ids || [];
      setValues(
        initialRule
          ? {
              ...emptyRule,
              ...initialRule,
              match_mode: matchMode,
              subscriber_ids: subscriberIds,
            }
          : { ...emptyRule, subscriber_ids: [] }
      );
      setSubscriberIdsText(subscriberIds.join(", "));
    }
  }, [initialRule, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!(values.source_host.trim() && values.target_host.trim())) {
      toast.error(
        t("rewriter.invalidRule", "Enter valid source and target hostnames.")
      );
      return;
    }

    if (values.match_mode === "range" && values.end_id < values.start_id) {
      toast.error(
        t(
          "rewriter.invalidRange",
          "The ending ID must not be smaller than the starting ID."
        )
      );
      return;
    }

    const subscriberIds =
      values.match_mode === "ids" ? parseSubscriberIds(subscriberIdsText) : [];
    if (
      values.match_mode === "ids" &&
      (!subscriberIds || subscriberIds.length === 0)
    ) {
      toast.error(
        t(
          "rewriter.invalidSubscriberIds",
          "Enter at least one valid non-negative integer subscription ID."
        )
      );
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        start_id: values.match_mode === "range" ? values.start_id : 0,
        end_id: values.match_mode === "range" ? values.end_id : 0,
        subscriber_ids: subscriberIds || [],
        source_host: values.source_host.trim(),
        target_host: values.target_host.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form className="space-y-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {initialRule
                ? t("rewriter.editRule", "Edit rewrite rule")
                : t("rewriter.addRule", "Add rewrite rule")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "rewriter.ruleDialogDescription",
                "Match a continuous ID range or enter individual subscription IDs."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rewrite-rule-name">
              {t("rewriter.ruleName", "Name")}
            </Label>
            <Input
              id="rewrite-rule-name"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              value={values.name}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("rewriter.matchMode", "Matching method")}</Label>
            <RadioGroup
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              onValueChange={(matchMode) =>
                setValues((current) => ({
                  ...current,
                  match_mode: matchMode as RuleInput["match_mode"],
                }))
              }
              value={values.match_mode}
            >
              <Label
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                htmlFor="rewrite-match-range"
              >
                <RadioGroupItem id="rewrite-match-range" value="range" />
                <span>
                  <span className="block font-medium">
                    {t("rewriter.rangeMode", "Continuous range")}
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    {t(
                      "rewriter.rangeModeDescription",
                      "Match every subscription ID between two boundaries."
                    )}
                  </span>
                </span>
              </Label>
              <Label
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                htmlFor="rewrite-match-ids"
              >
                <RadioGroupItem id="rewrite-match-ids" value="ids" />
                <span>
                  <span className="block font-medium">
                    {t("rewriter.idsMode", "Explicit IDs")}
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    {t(
                      "rewriter.idsModeDescription",
                      "Match only the individual subscription IDs you enter."
                    )}
                  </span>
                </span>
              </Label>
            </RadioGroup>
          </div>

          {values.match_mode === "range" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rewrite-start-id">
                  {t("rewriter.startId", "Starting ID")}
                </Label>
                <Input
                  id="rewrite-start-id"
                  min={0}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      start_id: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={values.start_id}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rewrite-end-id">
                  {t("rewriter.endId", "Ending ID")}
                </Label>
                <Input
                  id="rewrite-end-id"
                  min={0}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      end_id: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={values.end_id}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="rewrite-subscriber-ids">
                {t("rewriter.subscriberIds", "Subscription IDs")}
              </Label>
              <Textarea
                className="min-h-24 font-mono"
                id="rewrite-subscriber-ids"
                onChange={(event) => setSubscriberIdsText(event.target.value)}
                placeholder={t(
                  "rewriter.subscriberIdsPlaceholder",
                  "1, 2, 37, 89"
                )}
                value={subscriberIdsText}
              />
              <p className="text-muted-foreground text-xs">
                {t(
                  "rewriter.subscriberIdsDescription",
                  "Separate IDs with commas, spaces, or new lines. Duplicates are removed automatically."
                )}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rewrite-source-host">
              {t("rewriter.sourceHost", "Source hostname")}
            </Label>
            <Input
              id="rewrite-source-host"
              list="detected-subscription-hosts"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  source_host: event.target.value,
                }))
              }
              placeholder="old-entry.example.com"
              value={values.source_host}
            />
            <datalist id="detected-subscription-hosts">
              {sourceHosts.map((host) => (
                <option key={host} value={host} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rewrite-target-host">
              {t("rewriter.targetHost", "Target hostname")}
            </Label>
            <Input
              id="rewrite-target-host"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  target_host: event.target.value,
                }))
              }
              placeholder="group-a.example.com"
              value={values.target_host}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rewrite-priority">
                {t("rewriter.priority", "Priority")}
              </Label>
              <Input
                id="rewrite-priority"
                min={0}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    priority: Number(event.target.value),
                  }))
                }
                type="number"
                value={values.priority}
              />
            </div>
            <div className="flex items-end justify-between rounded-md border p-3">
              <Label htmlFor="rewrite-enabled">
                {t("rewriter.enabled", "Enabled")}
              </Label>
              <Switch
                checked={values.enabled}
                id="rewrite-enabled"
                onCheckedChange={(enabled) =>
                  setValues((current) => ({ ...current, enabled }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t("actions.cancel", "Cancel")}
            </Button>
            <Button disabled={saving} type="submit">
              {saving && <Icon className="animate-spin" icon="mdi:loading" />}
              {t("actions.save", "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
