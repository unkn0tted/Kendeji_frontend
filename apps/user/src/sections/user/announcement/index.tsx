"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Timeline } from "@workspace/ui/components/timeline";
import Empty from "@workspace/ui/composed/empty";
import { Markdown } from "@workspace/ui/composed/markdown";
import { queryAnnouncement } from "@workspace/ui/services/user/announcement";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";

export default function Announcement() {
  const { t } = useTranslation("components");
  const { data, isLoading } = useQuery({
    queryKey: ["queryAnnouncement"],
    queryFn: async () => {
      const { data } = await queryAnnouncement({
        page: 1,
        size: 99,
      });
      return data.data?.announcements || [];
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("menu.announcement", "Announcement Management")} />
      {isLoading ? (
        <div aria-busy className="flex flex-col gap-8">
          {[0, 1, 2].map((index) => (
            <div className="flex gap-4" key={index}>
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-2/5 max-w-48" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Timeline
          data={
            data.map((item) => ({
              title: item.title,
              content: <Markdown>{item.content}</Markdown>,
            })) || []
          }
        />
      ) : (
        <Empty border />
      )}
    </div>
  );
}
