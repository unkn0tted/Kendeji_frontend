"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { ConfirmButton } from "@workspace/ui/composed/confirm-button";
import {
  ProTable,
  type ProTableActions,
} from "@workspace/ui/composed/pro-table/pro-table";
import {
  createNode,
  deleteNode,
  filterNodeList,
  resetSortWithNode,
  toggleNodeStatus,
  updateNode,
} from "@workspace/ui/services/admin/server";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNode } from "@/stores/node";
import { useServer } from "@/stores/server";
import NodeForm from "./node-form";

function MobileNodeCard({
  node,
  serverName,
  serverAddress,
  protocolPort,
}: {
  node: API.Node;
  serverName: string;
  serverAddress: string;
  protocolPort: number | string;
}) {
  const { t } = useTranslation("nodes");

  return (
    <article className="min-w-0 space-y-4 rounded-md border bg-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold text-base leading-snug">
            {node.name}
          </h3>
          <span className="text-muted-foreground text-xs">#{node.id}</span>
        </div>
        <Badge variant={node.enabled ? "default" : "secondary"}>
          {node.enabled
            ? t("enabled_on", "Enabled")
            : t("enabled_off", "Disabled")}
        </Badge>
      </div>

      <dl className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("address", "Address")}</dt>
        <dd className="min-w-0 break-all font-mono text-xs">
          {node.address || "—"}:{node.port || "—"}
        </dd>
        <dt className="text-muted-foreground">{t("server", "Server")}</dt>
        <dd className="min-w-0 break-words">
          {serverName}
          <span className="block break-all font-mono text-muted-foreground text-xs">
            {serverAddress}
          </span>
        </dd>
        <dt className="text-muted-foreground">{t("protocol", "Protocol")}</dt>
        <dd className="min-w-0 break-all font-mono text-xs">
          {node.protocol}:{protocolPort}
        </dd>
        <dt className="text-muted-foreground">{t("tags", "Tags")}</dt>
        <dd className="flex min-w-0 flex-wrap gap-1.5">
          {node.tags?.length ? (
            node.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))
          ) : (
            <span>—</span>
          )}
        </dd>
      </dl>
    </article>
  );
}

export default function Nodes() {
  const { t } = useTranslation("nodes");
  const ref = useRef<ProTableActions>(null);
  const [loading, setLoading] = useState(false);

  // Use our zustand store for server data
  const { getServerName, getServerAddress, getProtocolPort } = useServer();
  const { fetchNodes, fetchTags } = useNode();

  return (
    <ProTable<API.Node, { search: string }>
      action={ref}
      actions={{
        render: (row) => [
          <NodeForm
            initialValues={row}
            key="edit"
            loading={loading}
            onSubmit={async (values) => {
              setLoading(true);
              try {
                const body: API.UpdateNodeRequest = {
                  ...row,
                  ...values,
                } as any;
                await updateNode(body);
                toast.success(t("updated", "Updated"));
                ref.current?.refresh();
                fetchNodes();
                fetchTags();
                setLoading(false);
                return true;
              } catch {
                setLoading(false);
                return false;
              }
            }}
            title={t("drawerEditTitle", "Edit Node")}
            trigger={t("edit", "Edit")}
          />,
          <ConfirmButton
            cancelText={t("cancel", "Cancel")}
            confirmText={t("confirm", "Confirm")}
            description={t(
              "confirmDeleteDesc",
              "This action cannot be undone."
            )}
            key="delete"
            onConfirm={async () => {
              await deleteNode({ id: row.id } as any);
              toast.success(t("deleted", "Deleted"));
              ref.current?.refresh();
              fetchNodes();
              fetchTags();
            }}
            title={t("confirmDeleteTitle", "Delete this node?")}
            trigger={
              <Button variant="destructive">{t("delete", "Delete")}</Button>
            }
          />,
          <Button
            key="copy"
            onClick={async () => {
              const {
                id: _id,
                sort: _sort,
                enabled: _enabled,
                updated_at: _updated_at,
                created_at: _created_at,
                ...rest
              } = row as any;
              await createNode({
                ...rest,
                enabled: false,
              });
              toast.success(t("copied", "Copied"));
              ref.current?.refresh();
              fetchNodes();
              fetchTags();
            }}
            variant="outline"
          >
            {t("copy", "Copy")}
          </Button>,
        ],
        batchRender(rows) {
          return [
            <ConfirmButton
              cancelText={t("cancel", "Cancel")}
              confirmText={t("confirm", "Confirm")}
              description={t(
                "confirmDeleteDesc",
                "This action cannot be undone."
              )}
              key="delete"
              onConfirm={async () => {
                await Promise.all(
                  rows.map((r) => deleteNode({ id: r.id } as any))
                );
                toast.success(t("deleted", "Deleted"));
                ref.current?.refresh();
                fetchNodes();
                fetchTags();
              }}
              title={t("confirmDeleteTitle", "Delete this node?")}
              trigger={
                <Button variant="destructive">{t("delete", "Delete")}</Button>
              }
            />,
          ];
        },
      }}
      columns={[
        {
          id: "enabled",
          header: t("enabled", "Enabled"),
          cell: ({ row }) => (
            <Switch
              checked={row.original.enabled}
              onCheckedChange={async (v) => {
                await toggleNodeStatus({ id: row.original.id, enable: v });
                toast.success(
                  v ? t("enabled_on", "Enabled") : t("enabled_off", "Disabled")
                );
                ref.current?.refresh();
                fetchNodes();
                fetchTags();
              }}
            />
          ),
        },
        { accessorKey: "name", header: t("name", "Name") },

        {
          id: "address_port",
          header: `${t("address", "Address")}:${t("port", "Port")}`,
          cell: ({ row }) =>
            `${row.original.address || "—"}:${row.original.port || "—"}`,
        },

        {
          id: "server_id",
          header: t("server", "Server"),
          cell: ({ row }) =>
            `${getServerName(row.original.server_id)}:${getServerAddress(row.original.server_id)}`,
        },
        {
          id: "protocol",
          header: ` ${t("protocol", "Protocol")}:${t("port", "Port")}`,
          cell: ({ row }) =>
            `${row.original.protocol}:${getProtocolPort(row.original.server_id, row.original.protocol)}`,
        },
        {
          accessorKey: "tags",
          header: t("tags", "Tags"),
          cell: ({ row }) => (
            <div className="flex flex-wrap gap-1">
              {(row.original.tags || []).length === 0
                ? "—"
                : row.original.tags.map((tg) => (
                    <Badge key={tg} variant="outline">
                      {tg}
                    </Badge>
                  ))}
            </div>
          ),
        },
      ]}
      header={{
        title: t("pageTitle", "Nodes"),
        toolbar: (
          <div className="hidden md:block">
            <NodeForm
              loading={loading}
              onSubmit={async (values) => {
                setLoading(true);
                try {
                  const body: API.CreateNodeRequest = {
                    name: values.name,
                    server_id: Number(values.server_id!),
                    protocol: values.protocol,
                    address: values.address,
                    port: Number(values.port!),
                    tags: values.tags || [],
                    enabled: false,
                  };
                  await createNode(body);
                  toast.success(t("created", "Created"));
                  ref.current?.refresh();
                  fetchNodes();
                  fetchTags();
                  setLoading(false);
                  return true;
                } catch {
                  setLoading(false);
                  return false;
                }
              }}
              title={t("drawerCreateTitle", "Create Node")}
              trigger={t("create", "Create")}
            />
          </div>
        ),
      }}
      mobileRowRender={(node) => (
        <MobileNodeCard
          node={node}
          protocolPort={getProtocolPort(node.server_id, node.protocol)}
          serverAddress={getServerAddress(node.server_id)}
          serverName={getServerName(node.server_id)}
        />
      )}
      onSort={async (source, target, items) => {
        // NOTE: `items` is the current page's items from ProTable.
        // Avoid mutating it in-place, and persist sort changes reliably.
        const sourceIndex = items.findIndex(
          (item) => String(item.id) === source
        );
        const targetIndex = items.findIndex(
          (item) => String(item.id) === target
        );

        if (sourceIndex === -1 || targetIndex === -1) return items;

        const prevSortById = new Map(items.map((it) => [it.id, it.sort]));

        const next = items.slice();
        const [movedItem] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, movedItem!);

        // IMPORTANT:
        // Some installations have duplicate / empty `sort` values (commonly 0 or null)
        // which makes the order appear "random" after refresh and also makes
        // "swap sort values" strategies a no-op.
        //
        // To make the ordering stable, we re-index the current page to a strictly
        // increasing sequence.
        const numericSorts = items
          .map((it) => (typeof it.sort === "number" ? it.sort : Number.NaN))
          .filter((v) => Number.isFinite(v)) as number[];
        const baseSort = numericSorts.length ? Math.min(...numericSorts) : 0;

        const updatedItems = next.map((item, index) => ({
          ...item,
          sort: baseSort + index,
        }));

        const changedItems = updatedItems.filter(
          (item) => item.sort !== prevSortById.get(item.id)
        );

        if (changedItems.length > 0) {
          await resetSortWithNode({
            // Send all changed rows (within the current page) so backend can persist.
            sort: changedItems.map((item) => ({
              id: item.id,
              sort: item.sort,
            })) as API.SortItem[],
          });
          toast.success(t("sorted_success", "Sorted successfully"));
        }

        return updatedItems;
      }}
      params={[{ key: "search" }]}
      request={async (pagination, filter) => {
        const { data } = await filterNodeList({
          page: pagination.page,
          size: pagination.size,
          search: filter?.search || undefined,
        });
        const rawList = (data?.data?.list || []) as API.Node[];
        // Backend should ideally return nodes already sorted, but we also sort on the
        // frontend to keep the UI stable (and avoid "random" order after refresh).
        const list = rawList.slice().sort((a, b) => {
          const as = a.sort;
          const bs = b.sort;
          const an = typeof as === "number" ? as : Number.POSITIVE_INFINITY;
          const bn = typeof bs === "number" ? bs : Number.POSITIVE_INFINITY;
          if (an !== bn) return an - bn;
          // Tie-breaker to keep a stable order.
          return Number(a.id) - Number(b.id);
        });
        const total = Number(data?.data?.total || list.length);
        return { list, total };
      }}
    />
  );
}
