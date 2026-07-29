export type OrderStatusAction = "complete" | "close";

const ORDER_STATUS_PENDING = 1;
const ORDER_STATUS_PAID = 2;
const ORDER_STATUS_CLOSED = 3;

interface BuildOrderStatusUpdateInput {
  action: OrderStatusAction;
  currentStatus: number;
  id: number;
  tradeNo?: string;
}

export function isOrderStatusEditable(status: number) {
  return status === ORDER_STATUS_PENDING;
}

export function buildOrderStatusUpdate({
  action,
  currentStatus,
  id,
  tradeNo,
}: BuildOrderStatusUpdateInput): API.UpdateOrderStatusRequest {
  if (!isOrderStatusEditable(currentStatus)) {
    throw new Error("Only pending orders can be updated");
  }

  if (action === "complete") {
    const normalizedTradeNo = tradeNo?.trim();
    if (!normalizedTradeNo) {
      throw new Error("A transaction number is required");
    }

    return {
      id,
      status: ORDER_STATUS_PAID,
      trade_no: normalizedTradeNo,
    };
  }

  return {
    id,
    status: ORDER_STATUS_CLOSED,
  };
}
