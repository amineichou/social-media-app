import express from "express";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Get user's notifications
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.userId },
      include: [
        {
          model: User,
          as: 'FromUser',
          attributes: ['id', 'firstName', 'lastName', 'username', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark notification as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { 
        id: req.params.id, 
        userId: req.userId 
      }
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all notifications as read
router.put("/read-all", auth, async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.userId, isRead: false } }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get unread count
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await Notification.count({
      where: { userId: req.userId, isRead: false }
    });

    res.json({ count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
