const NotificationsModel = require('../../models/notifications.model');
const UserModel = require('../../models/user.model');

class NotificationsRepository {
  async getLastReadNotification(userId) {
    return UserModel.findById(userId).select('lastReadNotifications');
  }

  async getMainPageCount(organizationId, userId) {
    const user = await this.getLastReadNotification(userId);
    const lastReadNotifications = user?.lastReadNotifications;
    return {
      total: await NotificationsModel.countDocuments({
        organizationId,
        createdAt: { $gt: lastReadNotifications },
      }),
    };
  }

  async createNotification(organizationId, content) {
    await NotificationsModel.create({ organizationId, content });
  }

  async getNotificationsSince(organizationId, since) {
    return NotificationsModel.find({
      organizationId,
      createdAt: { $gte: new Date(since) },
    });
  }

  async getNotifications(organizationId, userId) {
    const user = await this.getLastReadNotification(userId);
    const lastReadNotifications = user?.lastReadNotifications;
    await UserModel.findByIdAndUpdate(userId, { lastReadNotifications: new Date() });
    return {
      lastReadNotifications,
      notifications: await NotificationsModel.find({
        organizationId,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('createdAt content'),
    };
  }
}

module.exports = NotificationsRepository;
