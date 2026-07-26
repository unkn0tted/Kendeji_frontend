type InviteRelationshipUser = Pick<
  API.User,
  "id" | "refer_code" | "referer_id"
>;

export function normalizeInviteCode(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const code = value.trim();
  return code || undefined;
}

export function findInviteOwnerId(
  users: InviteRelationshipUser[],
  inviteCode: unknown
): number | undefined {
  const code = normalizeInviteCode(inviteCode);
  if (!code) return;

  const exactMatch = users.find((user) => user.refer_code === code);
  if (exactMatch) return exactMatch.id;

  const normalizedCode = code.toLocaleLowerCase();
  const caseInsensitiveMatches = users.filter(
    (user) => user.refer_code.toLocaleLowerCase() === normalizedCode
  );
  return caseInsensitiveMatches.length === 1
    ? caseInsensitiveMatches[0]?.id
    : undefined;
}

export function filterUsersInvitedBy(
  users: API.User[],
  inviteOwnerId: number
): API.User[] {
  return users.filter(
    (user) => Number(user.referer_id) === Number(inviteOwnerId)
  );
}

export function paginateUsers(
  users: API.User[],
  page: number,
  size: number
): API.User[] {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedSize = Math.max(1, Math.trunc(size));
  const start = (normalizedPage - 1) * normalizedSize;
  return users.slice(start, start + normalizedSize);
}
