import { getSubscription } from "@workspace/ui/services/user/portal";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isSubscribeVisible } from "@/utils/subscribe";
import { Content } from "./content";

const SHOWCASE_MEDIA_QUERY = "(min-width: 640px)";

export function ProductShowcase() {
  const { i18n } = useTranslation();
  const [subscriptionList, setSubscriptionList] = useState<API.Subscribe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Content renders `hidden sm:block`, so below the sm breakpoint the
  // showcase can never appear — skip the request until the viewport crosses
  // the breakpoint (a phone rotated to landscape still gets the data).
  const [isVisible, setIsVisible] = useState(
    () => window.matchMedia(SHOWCASE_MEDIA_QUERY).matches
  );

  useEffect(() => {
    const media = window.matchMedia(SHOWCASE_MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsVisible(true);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setIsLoading(false);
      return;
    }

    let stale = false;
    const fetchSubscriptions = async () => {
      try {
        const { data } = await getSubscription(
          {
            language: i18n.language,
          },
          {
            skipErrorHandler: true,
          }
        );
        if (stale) return;
        setSubscriptionList((data.data?.list || []).filter(isSubscribeVisible));
      } catch (error) {
        if (!stale) {
          console.error("Failed to fetch subscriptions:", error);
        }
      } finally {
        if (!stale) {
          setIsLoading(false);
        }
      }
    };

    fetchSubscriptions();
    return () => {
      stale = true;
    };
  }, [i18n.language, isVisible]);

  if (isLoading || subscriptionList.length === 0) return null;

  return <Content subscriptionData={subscriptionList} />;
}
