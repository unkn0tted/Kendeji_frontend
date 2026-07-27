import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Spinner } from "@workspace/ui/components/spinner";
import Empty from "@workspace/ui/composed/empty";
import { getSubscription } from "@workspace/ui/services/user/portal";
import { useTranslation } from "react-i18next";
import { Content as ProductShowcaseContent } from "@/sections/main/product-showcase/content";
import { isSubscribeVisible } from "@/utils/subscribe";
import Content from "./content";

export default function Purchasing() {
  const { id } = useSearch({ from: "/(main)/purchasing/" }) as { id?: string };
  const { i18n, t } = useTranslation(["main", "subscribe"]);
  const { data = [], isLoading } = useQuery({
    queryKey: ["subscription", i18n.language],
    queryFn: async () => {
      const { data } = await getSubscription(
        {
          language: i18n.language,
        },
        {
          skipErrorHandler: true,
        }
      );
      return data.data?.list || [];
    },
  });

  const subscriptionList = data.filter(isSubscribeVisible);
  const selectedId = Number(id);
  const hasSelectedId = Number.isFinite(selectedId) && selectedId > 0;
  const subscription = hasSelectedId
    ? subscriptionList.find((item: API.Subscribe) => item.id === selectedId)
    : undefined;

  if (!(hasSelectedId && subscription)) {
    return (
      <main className="container relative py-4 sm:py-6 lg:py-8">
        {isLoading ? (
          <div className="rose-panel mx-auto mt-8 flex max-w-xl items-center justify-center gap-3 p-8 text-center">
            <Spinner className="size-5" />
            <span>{t("loading", "Loading")}</span>
          </div>
        ) : subscriptionList.length > 0 ? (
          <div className="space-y-6">
            {hasSelectedId && !subscription && (
              <div className="rose-panel mx-auto max-w-xl p-6 text-center text-muted-foreground">
                {t("subscribe:subscriptionNotFound", "Subscription not found")}
              </div>
            )}
            <ProductShowcaseContent subscriptionData={subscriptionList} />
          </div>
        ) : (
          <Empty
            border
            description={t(
              "product_showcase_empty_description",
              "No packages are currently available."
            )}
          />
        )}
      </main>
    );
  }

  return (
    <main className="container relative py-4 sm:py-6 lg:py-8">
      <Content subscription={subscription} />
    </main>
  );
}
