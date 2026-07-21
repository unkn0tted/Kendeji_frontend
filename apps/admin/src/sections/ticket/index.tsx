import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { ConfirmButton } from "@workspace/ui/composed/confirm-button";
import { Icon } from "@workspace/ui/composed/icon";
import {
  ProTable,
  type ProTableActions,
} from "@workspace/ui/composed/pro-table/pro-table";
import { cn } from "@workspace/ui/lib/utils";
import {
  createTicketFollow,
  getTicket,
  getTicketList,
  updateTicketStatus,
} from "@workspace/ui/services/admin/ticket";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatDate } from "@/utils/common";
import { UserDetail } from "../user/user-detail";

type BulkCloseScope = "repliedBeforeThisMonth" | "replied" | "all";

const BULK_CLOSE_PAGE_SIZE = 100;
const BULK_CLOSE_CONCURRENCY = 10;

export default function Page() {
  const { t } = useTranslation("ticket");

  // i18n status declarations for extraction
  // t("status.0", "Status")
  // t("status.1", "Pending Follow-up")
  // t("status.2", "Pending Reply")
  // t("status.3", "Resolved")
  // t("status.4", "Closed")

  const [ticketId, setTicketId] = useState<any>(null);

  const [message, setMessage] = useState("");
  const [bulkClosing, setBulkClosing] = useState<BulkCloseScope | null>(null);

  const { data: ticket, refetch: refetchTicket } = useQuery({
    queryKey: ["getTicket", ticketId],
    queryFn: async () => {
      const { data } = await getTicket({
        id: ticketId,
      });
      return data.data as API.Ticket;
    },
    enabled: !!ticketId,
    refetchInterval: 5000,
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.children[1]?.scrollTo({
          top: scrollRef.current.children[1].scrollHeight,
          behavior: "smooth",
        });
      }
    }, 66);
  }, [ticket?.follow?.length]);

  const ref = useRef<ProTableActions>(null);

  const getBulkCloseTargets = async (scope: BulkCloseScope) => {
    const tickets = new Map<number, API.Ticket>();
    let page = 1;
    let total = 0;

    do {
      const { data } = await getTicketList({
        page,
        size: BULK_CLOSE_PAGE_SIZE,
        ...(scope !== "all" && { status: 2 }),
      });
      const result = data.data;
      const list = (result?.list || []) as API.Ticket[];

      for (const item of list) tickets.set(item.id, item);
      total = result?.total || 0;
      page += 1;

      if (list.length === 0) break;
    } while (tickets.size < total);

    const startOfThisMonth = new Date();
    startOfThisMonth.setHours(0, 0, 0, 0);
    startOfThisMonth.setDate(1);

    return [...tickets.values()].filter(
      (item) =>
        item.status !== 4 &&
        (scope !== "repliedBeforeThisMonth" ||
          new Date(item.created_at).getTime() < startOfThisMonth.getTime())
    );
  };

  const closeTickets = async (scope: BulkCloseScope) => {
    setBulkClosing(scope);

    try {
      const targets = await getBulkCloseTargets(scope);
      if (targets.length === 0) {
        toast.info(t("bulkClose.noTickets", "No matching tickets to close"));
        return;
      }

      let closed = 0;
      let failed = 0;
      for (
        let index = 0;
        index < targets.length;
        index += BULK_CLOSE_CONCURRENCY
      ) {
        const batch = targets.slice(index, index + BULK_CLOSE_CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((item) =>
            updateTicketStatus(
              { id: item.id, status: 4 },
              { skipErrorHandler: true }
            )
          )
        );

        closed += results.filter(
          (result) => result.status === "fulfilled"
        ).length;
        failed += results.filter(
          (result) => result.status === "rejected"
        ).length;
      }

      if (failed > 0) {
        toast.error(
          t("bulkClose.partialFailure", {
            defaultValue: "Closed {{closed}} tickets; {{failed}} failed",
            closed,
            failed,
          })
        );
      } else {
        toast.success(
          t("bulkClose.success", {
            defaultValue: "Closed {{count}} tickets",
            count: closed,
          })
        );
      }
      ref.current?.refresh();
    } finally {
      setBulkClosing(null);
    }
  };

  return (
    <>
      <ProTable<API.Ticket, { status: number }>
        action={ref}
        actions={{
          render(row) {
            if (row.status !== 4) {
              return [
                <Button key="reply" onClick={() => setTicketId(row.id)}>
                  {t("reply", "Reply")}
                </Button>,
                <ConfirmButton
                  cancelText={t("cancel", "Cancel")}
                  confirmText={t("confirm", "Confirm")}
                  description={t(
                    "closeWarning",
                    "Once closed, the ticket cannot be operated on. Please proceed with caution."
                  )}
                  key="colse"
                  onConfirm={async () => {
                    await updateTicketStatus({
                      id: row.id,
                      status: 4,
                    });
                    toast.success(t("closeSuccess", "Closed successfully"));
                    ref.current?.refresh();
                  }}
                  title={t("confirmClose", "Are you sure you want to close?")}
                  trigger={
                    <Button variant="destructive">{t("close", "Close")}</Button>
                  }
                />,
              ];
            }
            return [
              <Button key="check" onClick={() => setTicketId(row.id)} size="sm">
                {t("check", "Check")}
              </Button>,
            ];
          },
        }}
        columns={[
          {
            accessorKey: "title",
            header: t("title", "Title"),
          },
          {
            accessorKey: "user_id",
            header: t("user", "User"),
            cell: ({ row }) => <UserDetail id={row.original.user_id} />,
          },
          {
            accessorKey: "status",
            header: t("status.0", "Status"),
            cell: ({ row }) => (
              <span
                className={cn(
                  "flex items-center gap-2 before:block before:size-1.5 before:animate-pulse before:rounded-full before:ring-2 before:ring-opacity-50",
                  {
                    "before:bg-rose-500 before:ring-rose-500":
                      row.original.status === 1,
                    "before:bg-yellow-500 before:ring-yellow-500":
                      row.original.status === 2,
                    "before:bg-green-500 before:ring-green-500":
                      row.original.status === 3,
                    "before:bg-zinc-500 before:ring-zinc-500":
                      row.original.status === 4,
                  }
                )}
              >
                {t(`status.${row.original.status}`)}
              </span>
            ),
          },
          {
            accessorKey: "updated_at",
            header: t("updatedAt", "Updated At"),
            cell: ({ row }) => formatDate(row.getValue("updated_at")),
          },
        ]}
        header={{
          title: t("ticketList", "Ticket List"),
          toolbar: (
            <div className="flex flex-wrap justify-end gap-2">
              <ConfirmButton
                cancelText={t("cancel", "Cancel")}
                confirmText={t("confirm", "Confirm")}
                description={t(
                  "bulkClose.beforeThisMonthWarning",
                  "This closes replied tickets created before the current month. This action cannot be undone."
                )}
                onConfirm={() => closeTickets("repliedBeforeThisMonth")}
                title={t(
                  "bulkClose.beforeThisMonthConfirm",
                  "Close replied tickets before this month?"
                )}
                trigger={
                  <Button disabled={bulkClosing !== null} variant="outline">
                    {t(
                      "bulkClose.beforeThisMonth",
                      "Close replied tickets before this month"
                    )}
                  </Button>
                }
              />
              <ConfirmButton
                cancelText={t("cancel", "Cancel")}
                confirmText={t("confirm", "Confirm")}
                description={t(
                  "bulkClose.repliedWarning",
                  "This closes every ticket currently waiting for the user to reply. This action cannot be undone."
                )}
                onConfirm={() => closeTickets("replied")}
                title={t(
                  "bulkClose.repliedConfirm",
                  "Close all replied tickets?"
                )}
                trigger={
                  <Button disabled={bulkClosing !== null} variant="outline">
                    {t("bulkClose.replied", "Close all replied tickets")}
                  </Button>
                }
              />
              <ConfirmButton
                cancelText={t("cancel", "Cancel")}
                confirmText={t("confirm", "Confirm")}
                description={t(
                  "bulkClose.allWarning",
                  "This closes every open ticket, including tickets that have not been replied to. This action cannot be undone."
                )}
                onConfirm={() => closeTickets("all")}
                title={t("bulkClose.allConfirm", "Close all tickets?")}
                trigger={
                  <Button disabled={bulkClosing !== null} variant="destructive">
                    {t("bulkClose.all", "Close all tickets")}
                  </Button>
                }
              />
            </div>
          ),
        }}
        params={[
          {
            key: "status",
            placeholder: t("status.0", "Status"),
            options: [
              {
                label: t("close", "Close"),
                value: "4",
              },
            ],
          },
        ]}
        request={async (pagination, filters) => {
          const { data } = await getTicketList({
            ...pagination,
            ...filters,
          });

          const list = (data.data?.list || []) as API.Ticket[];

          // Client-side ordering to improve triage efficiency:
          // - Put "Pending Follow-up" (status=1) before "Pending Reply" (status=2)
          // - Within each group, sort by updated_at desc
          const statusPriority = (status: number) => {
            if (status === 1) return 0;
            if (status === 2) return 1;
            return 2;
          };
          const toTime = (value: any) => {
            const t = new Date(value).getTime();
            return Number.isFinite(t) ? t : 0;
          };

          list.sort((a, b) => {
            const pa = statusPriority(a.status);
            const pb = statusPriority(b.status);
            if (pa !== pb) return pa - pb;
            return toTime(b.updated_at) - toTime(a.updated_at);
          });

          return {
            list,
            total: data.data?.total || 0,
          };
        }}
      />

      <Drawer
        onOpenChange={(open) => {
          if (!open) setTicketId(null);
        }}
        open={!!ticketId}
      >
        <DrawerContent className="container mx-auto h-screen *:select-text">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>{ticket?.title}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="h-full overflow-hidden" ref={scrollRef}>
            <div className="flex h-full flex-col gap-4 p-4">
              {/* 显示工单描述作为第一条用户消息 */}
              {ticket?.description && (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-sm">
                      {formatDate(ticket.created_at)}
                    </p>
                    <p className="w-fit rounded-lg bg-accent p-2 font-medium">
                      {ticket.description}
                    </p>
                  </div>
                </div>
              )}

              {/* 显示后续跟进消息 */}
              {ticket?.follow?.map((item) => (
                <div
                  className={cn("flex items-center gap-4", {
                    "flex-row-reverse": item.from === "System",
                  })}
                  key={item.id}
                >
                  <div
                    className={cn("flex flex-col gap-1", {
                      "items-end": item.from === "System",
                    })}
                  >
                    <p className="text-muted-foreground text-sm">
                      {formatDate(item.created_at)}
                    </p>
                    <p
                      className={cn(
                        "w-fit rounded-lg bg-accent p-2 font-medium",
                        {
                          "bg-primary text-primary-foreground":
                            item.from === "System",
                        }
                      )}
                    >
                      {item.type === 1 && item.content}
                      {item.type === 2 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt="attachment"
                          className="!size-auto object-cover"
                          height={300}
                          src={item.content!}
                          width={300}
                        />
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {ticket?.status !== 4 && (
            <DrawerFooter>
              <form
                className="flex w-full flex-row items-center gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (message) {
                    await createTicketFollow({
                      ticket_id: ticketId,
                      from: "System",
                      type: 1,
                      content: message,
                    });
                    refetchTicket();
                    setMessage("");
                  }
                }}
              >
                <Button className="p-0" type="button" variant="outline">
                  <Label className="p-2" htmlFor="picture">
                    <Icon className="text-2xl" icon="uil:image-upload" />
                  </Label>
                  <Input
                    accept="image/*"
                    className="hidden"
                    id="picture"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file?.type.startsWith("image/")) {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = (e) => {
                          const img = new Image();
                          img.src = e.target?.result as string;
                          img.onload = () => {
                            const canvas = document.createElement("canvas");
                            const ctx = canvas.getContext("2d");

                            const maxWidth = 300;
                            const maxHeight = 300;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                              if (width > maxWidth) {
                                height = Math.round(
                                  (maxWidth / width) * height
                                );
                                width = maxWidth;
                              }
                            } else if (height > maxHeight) {
                              width = Math.round((maxHeight / height) * width);
                              height = maxHeight;
                            }

                            canvas.width = width;
                            canvas.height = height;
                            ctx?.drawImage(img, 0, 0, width, height);

                            canvas.toBlob(
                              (blob) => {
                                const reader = new FileReader();
                                reader.readAsDataURL(blob!);
                                reader.onloadend = async () => {
                                  await createTicketFollow({
                                    ticket_id: ticketId,
                                    from: "System",
                                    type: 2,
                                    content: reader.result as string,
                                  });
                                  refetchTicket();
                                };
                              },
                              "image/webp",
                              0.8
                            );
                          };
                        };
                      }
                    }}
                    type="file"
                  />
                </Button>
                <Input
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t(
                    "inputPlaceholder",
                    "Please enter your question, we will reply as soon as possible."
                  )}
                  value={message}
                />
                <Button disabled={!message} type="submit">
                  <Icon icon="uil:navigator" />
                </Button>
              </form>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
