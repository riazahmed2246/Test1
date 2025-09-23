const NotificationsRepository = require('./notifications.repository');
const EmailService = require('@gitroom/nestjs-libraries/services/email.service');
const OrganizationRepository = require('@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository');
const BullMqClient = require('@gitroom/nestjs-libraries/bull-mq-transport-new/client');
const { ioRedis } = require('@gitroom/nestjs-libraries/redis/redis.service');
const dayjs = require('dayjs');

class NotificationService {
  constructor(
    notificationRepository,
    emailService,
    organizationRepository,
    workerServiceProducer
  ) {
    this._notificationRepository = notificationRepository;
    this._emailService = emailService;
    this._organizationRepository = organizationRepository;
    this._workerServiceProducer = workerServiceProducer;
  }

  getMainPageCount(organizationId, userId) {
    return this._notificationRepository.getMainPageCount(organizationId, userId);
  }

  getNotifications(organizationId, userId) {
    return this._notificationRepository.getNotifications(organizationId, userId);
  }

  getNotificationsSince(organizationId, since) {
    return this._notificationRepository.getNotificationsSince(organizationId, since);
  }

  async inAppNotification(orgId, subject, message, sendEmail = false, digest = false) {
    const date = new Date().toISOString();
    await this._notificationRepository.createNotification(orgId, message);
    if (!sendEmail) {
      return;
    }

    if (digest) {
      // Add your own Redis logic here
      this._workerServiceProducer.emit('sendDigestEmail', {
        id: 'digest_' + orgId,
        options: {
          delay: 60000,
        },
        payload: {
          subject,
          org: orgId,
          since: date,
        },
      });

      return;
    }

    await this.sendEmailsToOrg(orgId, subject, message);
  }

  async sendEmailsToOrg(orgId, subject, message) {
    const userOrg = await this._organizationRepository.getAllUsersOrgs(orgId);
    for (const user of userOrg?.users || []) {
      await this.sendEmail(user.user.email, subject, message);
    }
  }

  async sendEmail(to, subject, html, replyTo) {
    await this._emailService.sendEmail(to, subject, html, replyTo);
  }

  hasEmailProvider() {
    return this._emailService.hasProvider();
  }
}

module.exports = NotificationService;
