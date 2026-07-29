import { Button } from "@workspace/ui/components/button";
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
import { Combobox } from "@workspace/ui/composed/combobox";
import { updateOrderStatus } from "@workspace/ui/services/admin/order";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  buildOrderStatusUpdate,
  type OrderStatusAction,
} from "./status-update";

interface OrderStatusControlProps {
  className?: string;
  onUpdated: () => void;
  order: API.Order;
}

export function OrderStatusControl({
  className,
  onUpdated,
  order,
}: OrderStatusControlProps) {
  const { t } = useTranslation("order");
  const [action, setAction] = useState<OrderStatusAction | null>(null);
  const [tradeNo, setTradeNo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const actionOptions = [
    {
      value: "complete" as const,
      label: t("statusUpdate.completeAction", "Confirm payment and complete"),
    },
    {
      value: "close" as const,
      label: t("statusUpdate.closeAction", "Close order"),
    },
  ];

  const closeDialog = () => {
    setAction(null);
    setTradeNo("");
  };

  const handleDialogChange = (open: boolean) => {
    if (!(open || isUpdating)) {
      closeDialog();
    }
  };

  const handleSubmit = async () => {
    if (!action) {
      return;
    }

    if (action === "complete" && !tradeNo.trim()) {
      toast.error(
        t(
          "statusUpdate.tradeNoRequired",
          "Enter a transaction number before completing the order."
        )
      );
      return;
    }

    setIsUpdating(true);
    try {
      await updateOrderStatus(
        buildOrderStatusUpdate({
          action,
          currentStatus: order.status,
          id: order.id,
          tradeNo,
        })
      );
      toast.success(
        action === "complete"
          ? t(
              "statusUpdate.completeSuccess",
              "The order has entered the completion workflow."
            )
          : t("statusUpdate.closeSuccess", "The order has been closed.")
      );
      closeDialog();
      onUpdated();
    } catch {
      // The shared request client already displays the API error.
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Combobox<OrderStatusAction, false>
        className={className}
        onChange={(nextAction) => {
          setAction(nextAction);
          setTradeNo(order.trade_no || "");
        }}
        options={actionOptions}
        placeholder={t("status.1", "Pending")}
      />

      <Dialog onOpenChange={handleDialogChange} open={action !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "complete"
                ? t(
                    "statusUpdate.completeTitle",
                    "Confirm payment and complete order"
                  )
                : t("statusUpdate.closeTitle", "Close order")}
            </DialogTitle>
            <DialogDescription>
              {action === "complete"
                ? t(
                    "statusUpdate.completeDescription",
                    "The order will first be marked as paid and enter the activation workflow. It will become completed automatically after activation succeeds."
                  )
                : t(
                    "statusUpdate.closeDescription",
                    "This pending order will be closed and cannot enter the payment workflow."
                  )}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {t("orderNumber", "Order Number")}:
              </span>{" "}
              <span className="font-medium">{order.order_no}</span>
            </div>

            {action === "complete" && (
              <div className="space-y-2">
                <Label htmlFor={`manual-order-trade-no-${order.id}`}>
                  {t("tradeNo", "Transaction Number")}
                </Label>
                <Input
                  autoComplete="off"
                  autoFocus
                  id={`manual-order-trade-no-${order.id}`}
                  onChange={(event) => setTradeNo(event.target.value)}
                  placeholder={t(
                    "statusUpdate.tradeNoPlaceholder",
                    "For example: MANUAL-order-number-date"
                  )}
                  value={tradeNo}
                />
                <p className="text-muted-foreground text-xs">
                  {t(
                    "statusUpdate.tradeNoHelp",
                    "Required for payment records and subsequent order activation. If there is no external reference, enter a unique manual processing ID."
                  )}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                disabled={isUpdating}
                onClick={closeDialog}
                type="button"
                variant="outline"
              >
                {t("statusUpdate.cancel", "Cancel")}
              </Button>
              <Button
                disabled={
                  isUpdating || (action === "complete" && !tradeNo.trim())
                }
                type="submit"
                variant={action === "close" ? "destructive" : "default"}
              >
                {isUpdating
                  ? t("statusUpdate.submitting", "Submitting...")
                  : t("statusUpdate.confirm", "Confirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
