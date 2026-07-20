import coreApi from "./coreApi";

/** List the signed-in user's notifications (newest first). */
export async function getNotifications({ limit = 20, unreadOnly = false } = {}) {
  const response = await coreApi.get("/notifications", {
    params: { limit, ...(unreadOnly ? { unreadOnly: true } : {}) },
  });
  return response.data.data;
}

/** Mark a single notification as read. */
export async function markNotificationRead(id) {
  const response = await coreApi.patch(`/notifications/${id}/read`);
  return response.data.data;
}

/** Mark every notification as read. */
export async function markAllNotificationsRead() {
  const response = await coreApi.patch("/notifications/read-all");
  return response.data.data;
}

/** Delete a notification. */
export async function deleteNotification(id) {
  const response = await coreApi.delete(`/notifications/${id}`);
  return response.data.data;
}
