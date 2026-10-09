export type ServerPresenceRecord = {
  status?: {
    online?: Array<{ user_id?: number | null }>;
    status?: string;
  };
};

/**
 * Summarize node-reported presence without using the traffic aggregation API.
 * A user can be reported by more than one node, so user IDs are deduplicated.
 */
export function summarizeServerPresence(servers: ServerPresenceRecord[]) {
  const onlineUserIds = new Set<number>();
  let onlineNodes = 0;

  for (const server of servers) {
    const status = server.status;
    const nodeIsActive =
      status?.status === "online" || status?.status === "warning";
    if (nodeIsActive) {
      onlineNodes += 1;
    }

    if (!nodeIsActive) continue;
    for (const onlineUser of status?.online || []) {
      if (typeof onlineUser.user_id === "number" && onlineUser.user_id > 0) {
        onlineUserIds.add(onlineUser.user_id);
      }
    }
  }

  return {
    onlineNodes,
    onlineUsers: onlineUserIds.size,
  };
}
