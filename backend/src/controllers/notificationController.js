/**
 * notificationController.js — In-app notifications for the signed-in user.
 *
 * Every query is scoped by `user_id` from the verified JWT, so a user can only
 * ever read or mutate their own notifications.
 */

import pool from "../config/db.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

function formatNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    metadata: row.metadata ?? null,
    createdAt: row.created_at,
  };
}

// ─── GET /api/notifications ─────────────────────────────────────────────────
export const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const unreadOnly = String(req.query.unreadOnly || "") === "true";

  const { rows } = await pool.query(
    `SELECT id, type, title, body, is_read, metadata, created_at
     FROM notifications
     WHERE user_id = $1 ${unreadOnly ? "AND is_read = FALSE" : ""}
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  const { rows: counts } = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_read = FALSE)::int AS unread
     FROM notifications WHERE user_id = $1`,
    [userId]
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: "Notifications fetched successfully",
    data: {
      notifications: rows.map(formatNotification),
      total: counts[0]?.total ?? 0,
      unreadCount: counts[0]?.unread ?? 0,
    },
  });
});

// ─── PATCH /api/notifications/:id/read ──────────────────────────────────────
export const markAsRead = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, type, title, body, is_read, metadata, created_at`,
    [req.params.id, req.user.id]
  );

  if (rows.length === 0) {
    throw new AppError("Notification not found.", 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Notification marked as read",
    data: { notification: formatNotification(rows[0]) },
  });
});

// ─── PATCH /api/notifications/read-all ──────────────────────────────────────
export const markAllAsRead = asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE`,
    [req.user.id]
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: "All notifications marked as read",
    data: { updated: rowCount, unreadCount: 0 },
  });
});

// ─── DELETE /api/notifications/:id ──────────────────────────────────────────
export const deleteNotification = asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );

  if (rowCount === 0) {
    throw new AppError("Notification not found.", 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Notification deleted",
    data: { id: req.params.id },
  });
});
