import { describe, expect, test } from "bun:test";
import {
  filterUsersInvitedBy,
  findInviteOwnerId,
  normalizeInviteCode,
  paginateUsers,
} from "../../apps/admin/src/sections/user/invite-code-users";
import { fetchAllPaginated } from "../../apps/admin/src/stores/pagination";

function createUser(id: number, referCode: string, refererId = 0): API.User {
  return {
    id,
    refer_code: referCode,
    referer_id: refererId,
  } as API.User;
}

describe("invite code user lookup", () => {
  const users = [
    createUser(10, "Alpha"),
    createUser(20, "Beta", 10),
    createUser(30, "Gamma", 10),
    createUser(40, "Delta", 20),
  ];

  test("trims invite code input and resolves its owner", () => {
    expect(normalizeInviteCode("  Alpha  ")).toBe("Alpha");
    expect(findInviteOwnerId(users, "Alpha")).toBe(10);
  });

  test("supports an unambiguous case-insensitive code lookup", () => {
    expect(findInviteOwnerId(users, "alpha")).toBe(10);
    expect(
      findInviteOwnerId(
        [createUser(10, "Alpha"), createUser(20, "ALPHA")],
        "alpha"
      )
    ).toBeUndefined();
  });

  test("returns only direct invitees and paginates the filtered result", () => {
    const invitedUsers = filterUsersInvitedBy(users, 10);
    expect(invitedUsers.map((user) => user.id)).toEqual([20, 30]);
    expect(paginateUsers(invitedUsers, 2, 1).map((user) => user.id)).toEqual([
      30,
    ]);
  });
});

describe("bounded paginated loading", () => {
  test("loads every page in order with at most five concurrent requests", async () => {
    let active = 0;
    let maximumActive = 0;
    const requestedPages: number[] = [];

    const users = await fetchAllPaginated<number>(async ({ page }) => {
      requestedPages.push(page);
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return {
        data: {
          data: {
            list: [page],
            total: 650,
          },
        },
      };
    });

    expect(users).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(requestedPages.sort((left, right) => left - right)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(maximumActive).toBe(5);
  });
});
