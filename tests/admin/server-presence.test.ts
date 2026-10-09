import { describe, expect, test } from "bun:test";
import { summarizeServerPresence } from "../../apps/admin/src/utils/server-presence";

describe("server presence summary", () => {
  test("deduplicates users reported by multiple nodes", () => {
    expect(
      summarizeServerPresence([
        {
          status: {
            online: [{ user_id: 12 }, { user_id: 34 }],
            status: "online",
          },
        },
        {
          status: {
            online: [{ user_id: 12 }, { user_id: 56 }],
            status: "warning",
          },
        },
      ])
    ).toEqual({ onlineNodes: 2, onlineUsers: 3 });
  });

  test("ignores offline nodes and invalid user IDs", () => {
    expect(
      summarizeServerPresence([
        {
          status: {
            online: [{ user_id: 1 }, { user_id: 0 }, { user_id: null }],
            status: "offline",
          },
        },
        { status: { status: "offline" } },
        {},
      ])
    ).toEqual({ onlineNodes: 0, onlineUsers: 0 });
  });
});
