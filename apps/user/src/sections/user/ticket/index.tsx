"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Textarea } from "@workspace/ui/components/textarea";
import { ConfirmButton } from "@workspace/ui/composed/confirm-button";
import Empty from "@workspace/ui/composed/empty";
import { Icon } from "@workspace/ui/composed/icon";
import {
  ProList,
  type ProListActions,
} from "@workspace/ui/composed/pro-list/pro-list";
import { cn } from "@workspace/ui/lib/utils";
import {
  createUserTicket,
  createUserTicketFollow,
  getUserTicketDetails,
  getUserTicketList,
  updateUserTicketStatus,
} from "@workspace/ui/services/user/ticket";
import { formatDate } from "@workspace/ui/utils/formatting";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DescriptionList } from "@/components/description-list";
import { PageHeader } from "@/components/page-header";

export default function Ticket() {
  const { t } = useTranslation("ticket");
  const statusMap: Record<number, string> = {
    0: t("status.0", "Status"),
    1: t("status.1", "Pending Reply"),
    2: t("status.2", "Pending Follow-up"),
    3: t("status.3", "Resolved"),
    4: t("status.4", "Closed"),
  };

  const [ticketId, setTicketId] = useState<any>(null);
  const [message, setMessage] = useState("");

  const { data: ticket, refetch: refetchTicket } = useQuery({
    queryKey: ["getUserTicketDetails", ticketId],
    queryFn: async () => {
      const { data } = await getUserTicketDetails({ id: ticketId });
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

  const ref = useRef<ProListActions>(null);
  const [create, setCreate] =
    useState<Partial<API.CreateUserTicketRequest & { open: boolean }>>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Dialog
            onOpenChange={(open) => setCreate({ open })}
            open={create?.open}
          >
            <DialogTrigger asChild>
              <Button size="sm">{t("createTicket", "Create Ticket")}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t("createTicket", "Create Ticket")}</DialogTitle>
                <DialogDescription>
                  {t("createTicketDescription", "Create Ticket Description")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Label htmlFor="title">{t("title", "Title")}</Label>
                <Input
                  defaultValue={create?.title}
                  id="title"
                  onChange={(e) =>
                    setCreate({ ...create, title: e.target.value! })
                  }
                />
                <Label htmlFor="content">
                  {t("description", "Description")}
                </Label>
                <Textarea
                  defaultValue={create?.description}
                  id="content"
                  onChange={(e) =>
                    setCreate({ ...create, description: e.target.value! })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  disabled={
                    isSubmitting || !(create?.title && create?.description)
                  }
                  onClick={async () => {
                    if (isSubmitting) return;
                    setIsSubmitting(true);
                    try {
                      await createUserTicket({
                        title: create!.title!,
                        description: create!.description!,
                      });
                      ref.current?.refresh();
                      toast.success(t("createSuccess", "Create Success"));
                      setCreate({ open: false });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {t("submit", "Submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
        description={t("pageDescription", "Get help from our support team")}
        title={t("ticketList", "Ticket List")}
      />
      <ProList<API.Ticket, { status: number }>
        action={ref}
        empty={<Empty />}
        params={[
          {
            key: "search",
          },
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
        renderItem={(item) => (
          <div className="rose-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 sm:px-4">
              <span
                className={cn(
                  "flex items-center gap-2 font-semibold before:block before:size-1.5 before:animate-pulse before:rounded-full before:ring-2",
                  {
                    "before:bg-chart-3 before:ring-chart-3/50":
                      item.status === 1,
                    "before:bg-primary before:ring-primary/50":
                      item.status === 2,
                    "before:bg-chart-2 before:ring-chart-2/50":
                      item.status === 3,
                    "before:bg-muted-foreground before:ring-muted-foreground/50":
                      item.status === 4,
                  }
                )}
              >
                {statusMap[item.status] ||
                  t(`status.${item.status}`, "Unknown Status")}
              </span>
              <div className="flex flex-wrap gap-2">
                {item.status !== 4 ? (
                  <>
                    <Button
                      key="reply"
                      onClick={() => setTicketId(item.id)}
                      size="sm"
                    >
                      {t("reply", "Reply")}
                    </Button>
                    <ConfirmButton
                      cancelText={t("cancel", "Cancel")}
                      confirmText={t("confirm", "Confirm")}
                      description={t(
                        "closeWarning",
                        "Are you sure you want to close this ticket?"
                      )}
                      key="close"
                      onConfirm={async () => {
                        await updateUserTicketStatus({
                          id: item.id,
                          status: 4,
                        });
                        toast.success(t("closeSuccess", "Close Success"));
                        ref.current?.refresh();
                      }}
                      title={t("confirmClose", "Confirm Close")}
                      trigger={
                        <Button size="sm" variant="destructive">
                          {t("close", "Close")}
                        </Button>
                      }
                    />
                  </>
                ) : (
                  <Button
                    key="check"
                    onClick={() => setTicketId(item.id)}
                    size="sm"
                  >
                    {t("check", "Check")}
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3 text-sm sm:p-4">
              <DescriptionList
                className="grid-cols-1 lg:grid-cols-3"
                items={[
                  {
                    label: t("title", "Title"),
                    value: <span> {item.title}</span>,
                  },
                  {
                    label: t("description", "Description"),
                    value: <time>{item.description}</time>,
                  },
                  {
                    label: t("updatedAt", "Updated At"),
                    value: <time>{formatDate(item.updated_at)}</time>,
                  },
                ]}
              />
            </div>
          </div>
        )}
        request={async (pagination, filters) => {
          const { data } = await getUserTicketList({
            ...pagination,
            ...filters,
          });
          return {
            list: data.data?.list || [],
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
        <DrawerContent className="container mx-auto h-screen">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>{ticket?.title}</DrawerTitle>
            <DrawerDescription className="line-clamp-3">
              {ticket?.description}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="h-full overflow-hidden" ref={scrollRef}>
            <div className="flex flex-col gap-4 p-4">
              {ticket?.follow?.map((item) => (
                <div
                  className={cn("flex items-center gap-4", {
                    "flex-row-reverse": item.from !== "System",
                  })}
                  key={item.id}
                >
                  <div
                    className={cn("flex flex-col gap-1", {
                      "items-end": item.from !== "System",
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
                            item.from !== "System",
                        }
                      )}
                    >
                      {item.type === 1 && item.content}
                      {item.type === 2 && (
                        <img
                          alt="ticket attachment"
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
                    await createUserTicketFollow({
                      ticket_id: ticketId,
                      from: "User",
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
                                  await createUserTicketFollow({
                                    ticket_id: ticketId,
                                    from: "User",
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
                  placeholder={t("inputPlaceholder", "Input Placeholder")}
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
    </div>
  );
}
