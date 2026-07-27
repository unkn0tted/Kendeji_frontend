"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import {
  purchaseCheckout,
  queryPurchaseOrder,
} from "@workspace/ui/services/user/portal";
import { useEffect, useState } from "react";
import { OrderStatusView } from "@/sections/order-status";
import { useGetUserInfo } from "@/stores/global";
import { setAuthorization } from "@/utils/common";

/**
 * The generated API.QueryPurchaseOrderResponse lacks `type`, although the
 * runtime payload carries it (the shared view branches on it for the reset
 * traffic / recharge sections). typings.d.ts is generated output, so extend
 * locally instead of editing it.
 */
type GuestOrder = API.QueryPurchaseOrderResponse & { type?: number };

/**
 * Guest order status page: polls the public portal endpoint using the guest
 * identity stashed in localStorage at checkout, and promotes the visitor to a
 * logged-in session once the order settles and a token is returned. All
 * presentation lives in <OrderStatusView>, shared with the logged-in flow
 * (sections/user/payment).
 */
export default function Order() {
  const getUserInfo = useGetUserInfo();
  const [orderNo, setOrderNo] = useState<string>();
  const [enabled, setEnabled] = useState<boolean>(false);
  const search = useSearch({ from: "/(main)/purchasing/order/" });

  const { data, refetch } = useQuery({
    enabled,
    queryKey: ["queryPurchaseOrder", orderNo],
    queryFn: async (): Promise<GuestOrder | undefined> => {
      if (!orderNo) return;
      // Guest auth params were stored under the order number at checkout.
      const params = localStorage.getItem(orderNo);
      const authParams = params ? JSON.parse(params) : {};
      const { data } = await queryPurchaseOrder({
        order_no: orderNo,
        ...authParams,
      });
      if (data?.data?.status !== 1) {
        setEnabled(false);
        if (data?.data?.token) {
          setAuthorization(data?.data?.token);
          await new Promise((resolve) => setTimeout(resolve, 100));
          await getUserInfo();
        }
      }
      return data?.data;
    },
    refetchInterval: 3000,
  });

  const { data: payment } = useQuery({
    enabled: !!orderNo && data?.status === 1,
    queryKey: ["purchaseCheckout", orderNo],
    queryFn: async () => {
      const { data } = await purchaseCheckout({
        orderNo: orderNo || "",
        returnUrl: window.location.href,
      });
      if (data.data?.type === "url" && data.data?.checkout_url) {
        window.open(data.data.checkout_url, "_blank");
      }
      return data?.data;
    },
  });

  useEffect(() => {
    if (search.order_no) {
      setOrderNo(search.order_no);
      setEnabled(true);
    }
  }, [search]);

  return (
    <main className="container lg:mt-16">
      <OrderStatusView
        isLoggedIn={false}
        onRefresh={() => refetch()}
        order={data}
        payment={payment}
      />
    </main>
  );
}
