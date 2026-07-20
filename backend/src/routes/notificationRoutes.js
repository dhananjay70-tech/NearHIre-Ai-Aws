/**
 * notificationRoutes.js — Routes for /api/notifications.
 * All routes require an authenticated user (any role).
 */

import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

// GET    /api/notifications              — list (supports ?limit & ?unreadOnly)
router.get('/', listNotifications);

// PATCH  /api/notifications/read-all     — mark every notification as read
// Declared BEFORE '/:id/read' so 'read-all' is not captured by the id param.
router.patch('/read-all', markAllAsRead);

// PATCH  /api/notifications/:id/read     — mark one as read
router.patch('/:id/read', markAsRead);

// DELETE /api/notifications/:id          — remove one
router.delete('/:id', deleteNotification);

export default router;
