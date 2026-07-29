import { describe, expect, test } from "bun:test";
import {
  buildOrderStatusUpdate,
  isOrderStatusEditable,
} from "../../apps/admin/src/sections/order/status-update";

describe("admin order status updates", () => {
  test("only pending orders expose status actions", () => {
    expect(isOrderStatusEditable(1)).toBe(true);
    expect(isOrderStatusEditable(2)).toBe(false);
    expect(isOrderStatusEditable(3)).toBe(false);
    expect(isOrderStatusEditable(4)).toBe(false);
    expect(isOrderStatusEditable(5)).toBe(false);
  });

  test("completes through the paid activation workflow", () => {
    expect(
      buildOrderStatusUpdate({
        action: "complete",
        currentStatus: 1,
        id: 42,
        tradeNo: "  offline-20260729-001  ",
      })
    ).toEqual({
      id: 42,
      status: 2,
      trade_no: "offline-20260729-001",
    });
  });

  test("requires a transaction number when completing an order", () => {
    expect(() =>
      buildOrderStatusUpdate({
        action: "complete",
        currentStatus: 1,
        id: 42,
        tradeNo: "   ",
      })
    ).toThrow("A transaction number is required");
  });

  test("closes a pending order without payment fields", () => {
    expect(
      buildOrderStatusUpdate({
        action: "close",
        currentStatus: 1,
        id: 42,
        tradeNo: "must-not-be-sent",
      })
    ).toEqual({
      id: 42,
      status: 3,
    });
  });

  test("rejects updates to non-pending orders", () => {
    expect(() =>
      buildOrderStatusUpdate({
        action: "close",
        currentStatus: 5,
        id: 42,
      })
    ).toThrow("Only pending orders can be updated");
  });
});
