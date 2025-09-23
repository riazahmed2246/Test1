const MessagesRepository = require('./messages.repository');
const OrganizationRepository = require('./organization.repository');
const NotificationService = require('./notification.service');
const BullMqClient = require('./bull-mq-client');

class MessagesService {
  constructor(workerServiceProducer, messagesRepository, organizationRepository, inAppNotificationService) {
    this._workerServiceProducer = workerServiceProducer;
    this._messagesRepository = messagesRepository;
    this._organizationRepository = organizationRepository;
    this._inAppNotificationService = inAppNotificationService;
  }

  async createConversation(userId, organizationId, body) {
    const conversation = await this._messagesRepository.createConversation(userId, organizationId, body);
    const orgs = await this._organizationRepository.getOrgsByUserId(body.to);
    await Promise.all(
      orgs.map(async (org) => {
        return this._inAppNotificationService.inAppNotification(org.id, 'Request for service', 'A user has requested a service from you', true);
      })
    );
    return conversation;
  }

  getMessagesGroup(userId, organizationId) {
    return this._messagesRepository.getMessagesGroup(userId, organizationId);
  }

  async getMessages(userId, organizationId, groupId, page) {
    if (page === 1) {
      this._messagesRepository.updateOrderOnline(userId);
    }
    return this._messagesRepository.getMessages(userId, organizationId, groupId, page);
  }

  async createNewMessage(group, from, content, special) {
    const message = await this._messagesRepository.createNewMessage(group, from, content, special);
    const user = from === 'BUYER' ? message.group.seller : message.group.buyer;
    await Promise.all(
      user.organizations.map((p) => {
        return this.sendMessageNotification({ id: p.organizationId, lastOnline: user.lastOnline });
      })
    );
    return message;
  }

  async sendMessageNotification(user) {
    // Add your own dayjs logic if needed
    await this._inAppNotificationService.inAppNotification(user.id, 'New message', 'You have a new message', true);
  }

  async createMessage(userId, orgId, groupId, body) {
    const message = await this._messagesRepository.createMessage(userId, orgId, groupId, body);
    await Promise.all(
      message.organizations.map((p) => {
        return this.sendMessageNotification({ id: p.organizationId, lastOnline: message.lastOnline });
      })
    );
    return message;
  }

  createOffer(userId, body) {
    return this._messagesRepository.createOffer(userId, body);
  }

  getOrderDetails(userId, organizationId, orderId) {
    return this._messagesRepository.getOrderDetails(userId, organizationId, orderId);
  }

  canAddPost(id, order, integrationId) {
    return this._messagesRepository.canAddPost(id, order, integrationId);
  }

  changeOrderStatus(orderId, status, paymentIntent) {
    return this._messagesRepository.changeOrderStatus(orderId, status, paymentIntent);
  }

  getOrgByOrder(orderId) {
    return this._messagesRepository.getOrgByOrder(orderId);
  }

  getMarketplaceAvailableOffers(orgId, id) {
    return this._messagesRepository.getMarketplaceAvailableOffers(orgId, id);
  }

  getPost(userId, orgId, postId) {
    return this._messagesRepository.getPost(userId, orgId, postId);
  }

  requestRevision(userId, orgId, postId, message) {
    return this._messagesRepository.requestRevision(userId, orgId, postId, message);
  }

  async requestApproved(userId, orgId, postId, message) {
    const post = await this._messagesRepository.requestApproved(userId, orgId, postId, message);
    if (post) {
      this._workerServiceProducer.emit('post', {
        id: post.id,
        options: {
          delay: 0,
        },
        payload: {
          id: post.id,
        },
      });
    }
  }

  async requestCancel(orgId, postId) {
    const cancel = await this._messagesRepository.requestCancel(orgId, postId);
    await this._workerServiceProducer.delete('post', postId);
    return cancel;
  }

  async completeOrderAndPay(orgId, order) {
    const orderList = await this._messagesRepository.completeOrderAndPay(orgId, order);
    if (!orderList) {
      return false;
    }
    orderList.posts.forEach((post) => {
      this._workerServiceProducer.delete('post', post.id);
    });
    return orderList;
  }

  completeOrder(orderId) {
    return this._messagesRepository.completeOrder(orderId);
  }

  payoutProblem(orderId, sellerId, amount, postId) {
    return this._messagesRepository.payoutProblem(orderId, sellerId, amount, postId);
  }

  getOrders(userId, orgId, type) {
    return this._messagesRepository.getOrders(userId, orgId, type);
  }
}

module.exports = MessagesService;
