"use client";

import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { queryOrderDetail } from "@workspace/ui/services/user/order";
import { purchaseCheckout } from "@workspace/ui/services/user/portal";
import { useEffect, useState } from "react";
import { OrderStatusView } from "@/sections/order-status";
import { useGetUserInfo } from "@/stores/global";

const routeApi = getRouteApi("/(main)/payment");

/**
 * Logged-in order status page: authenticated polling plus a user-info refresh
 * once the order settles. All presentation lives in <OrderStatusView>, shared
 * with the guest flow (sections/purchasing/order.tsx).
 */
export default function Page() {
  const getUserInfo = useGetUserInfo();
  const { order_no } = routeApi.useSearch() as { order_no?: string };
  const [enabled, setEnabled] = useState<boolean>(!!order_no);

  useEffect(() => {
    if (order_no) {
      setEnabled(true);
    }
  }, [order_no]);

  const { data, refetch } = useQuery({
    enabled: enabled && !!order_no,
    queryKey: ["queryOrderDetail", order_no],
    queryFn: async () => {
      const { data } = await queryOrderDetail({ order_no: order_no! });
      return data?.data;
    },
    refetchInterval: 3000,
  });

  // Once the order leaves the pending state, stop polling and refresh the
  // user snapshot (balance / subscription may have changed).
  useEffect(() => {
    if (data && data.status !== 1) {
      getUserInfo();
      setEnabled(false);
    }
  }, [data, getUserInfo]);

  const { data: payment } = useQuery({
    enabled: !!order_no && data?.status === 1,
    queryKey: ["purchaseCheckout", order_no],
    queryFn: async () => {
      const { data } = await purchaseCheckout({
        orderNo: order_no!,
        returnUrl: window.location.href,
      });
      if (data.data?.type === "url" && data.data.checkout_url) {
        window.open(data.data.checkout_url, "_blank");
      }
      return data?.data;
    },
  });

  return (
    <div className="container pt-16">
      <OrderStatusView
        isLoggedIn
        onRefresh={() => refetch()}
        order={data}
        payment={payment}
      />
    </div>
  );
}
