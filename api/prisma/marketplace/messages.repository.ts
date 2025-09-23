// Import Mongoose models
const MessagesGroupModel = require('../../models/messagesGroup.model');
const MessagesModel = require('../../models/messages.model');
const OrdersModel = require('../../models/orders.model');
const OrganizationsModel = require('../../models/organization.model');
const PostModel = require('../../models/post.model');
const PayoutProblemsModel = require('../../models/payoutProblems.model');
const UserModel = require('../../models/user.model');

class MessagesRepository {
  constructor() {
    // No DI, use direct model access
  }

  async createConversation(userId, organizationId, body) {
    let group = await MessagesGroupModel.findOne({
      buyerOrganizationId: organizationId,
      buyerId: userId,
      sellerId: body.to,
    });
    if (!group) {
      group = await MessagesGroupModel.create({
        buyerOrganizationId: organizationId,
        buyerId: userId,
        sellerId: body.to,
      });
    }
    group.updatedAt = new Date();
    await group.save();
    await MessagesModel.create({
      groupId: group._id,
      from: 'BUYER',
      content: body.message,
    });
    return { id: group._id };
  }

  async getOrgByOrder(orderId) {
    const order = await OrdersModel.findById(orderId).populate({
      path: 'messageGroup',
      select: 'buyerOrganizationId',
    });
    return order?.messageGroup?.buyerOrganizationId;
  }

  async getMessagesGroup(userId, organizationId) {
    return MessagesGroupModel.find({
      $or: [
        { buyerOrganizationId: organizationId, buyerId: userId },
        { sellerId: userId },
      ],
    })
      .sort({ updatedAt: -1 })
      .populate('seller buyer orders messages');
  }

  async createMessage(userId, orgId, groupId, body) {
    const group = await MessagesGroupModel.findOne({
      _id: groupId,
      $or: [
        { buyerOrganizationId: orgId, buyerId: userId },
        { sellerId: userId },
      ],
    });
    if (!group) throw new Error('Group not found');
    const from = group.buyerId === userId ? 'BUYER' : 'SELLER';
    const create = await this.createNewMessage(groupId, from, body.message);
    group.updatedAt = new Date();
    await group.save();
    return userId === group.buyerId ? create.group.seller : create.group.buyer;
  }

  async updateOrderOnline(userId) {
    await UserModel.findByIdAndUpdate(userId, { lastOnline: new Date() });
  }

  async getMessages(userId, organizationId, groupId, page) {
    return MessagesGroupModel.findOne({
      _id: groupId,
      $or: [
        { buyerOrganizationId: organizationId, buyerId: userId },
        { sellerId: userId },
      ],
    })
      .populate({
        path: 'messages',
        options: {
          sort: { createdAt: -1 },
          limit: 10,
          skip: (page - 1) * 10,
        },
      });
  }

  async createOffer(userId, body) {
    const messageGroup = await MessagesGroupModel.findOne({
      _id: body.group,
      sellerId: userId,
    }).populate('buyer orders');
    if (!messageGroup) throw new Error('Group not found');
    if (
      messageGroup.orders.length &&
      !['COMPLETED', 'CANCELED'].includes(messageGroup.orders[0].status)
    ) {
      throw new Error('Order already exists');
    }
    const order = await OrdersModel.create({
      sellerId: userId,
      buyerId: messageGroup.buyer._id,
      messageGroupId: messageGroup._id,
      ordersItems: body.socialMedia.map((item) => ({
        quantity: item.total,
        integrationId: item.value,
        price: item.price,
      })),
      status: 'PENDING',
    });
    await MessagesModel.create({
      groupId: body.group,
      from: 'SELLER',
      content: '',
      special: JSON.stringify({ type: 'offer', data: order }),
    });
    return { success: true };
  }

  async createNewMessage(group, from, content, special) {
    return MessagesModel.create({
      groupId: group,
      from,
      content,
      special: JSON.stringify(special),
    });
  }

  async getOrderDetails(userId, organizationId, orderId) {
    const group = await MessagesGroupModel.findOne({
      buyerId: userId,
      buyerOrganizationId: organizationId,
    }).populate({
      path: 'buyer seller orders',
      match: { _id: orderId, status: 'PENDING' },
      populate: {
        path: 'ordersItems',
        populate: { path: 'integration' },
      },
    });
    if (!group?.orders?.length) throw new Error('Order not found');
    return {
      buyer: group.buyer,
      seller: group.seller,
      order: group.orders[0],
    };
  }

  async canAddPost(id, order, integrationId) {
    const findOrder = await OrdersModel.findOne({
      _id: order,
      status: 'ACCEPTED',
    }).select('posts ordersItems');
    if (!findOrder) {
      return false;
    }
    if (
      findOrder.posts.find(
        (p) => p.id === id && p.approvedSubmitForOrder === 'YES'
      )
    ) {
      return false;
    }
    if (
      findOrder.posts.find(
        (p) =>
          p.id === id && p.approvedSubmitForOrder === 'WAITING_CONFIRMATION'
      )
    ) {
      return true;
    }
    const postsForIntegration = findOrder.ordersItems.filter(
      (p) => p.integrationId === integrationId
    );
    const totalPostsRequired = postsForIntegration.reduce(
      (acc, item) => acc + item.quantity,
      0
    );
    const usedPosts = findOrder.posts.filter(
      (p) =>
        p.integrationId === integrationId &&
        ['WAITING_CONFIRMATION', 'YES'].indexOf(p.approvedSubmitForOrder) > -1
    ).length;
    return totalPostsRequired > usedPosts;
  }

  changeOrderStatus(orderId, status, paymentIntent) {
    return OrdersModel.findByIdAndUpdate(orderId, {
      status,
      captureId: paymentIntent,
    });
  }

  async getMarketplaceAvailableOffers(orgId, id) {
    const offers = await OrganizationsModel.findById(orgId).select({
      users: {
        $elemMatch: {
          user: {
            orderSeller: {
              $elemMatch: {
                status: 'ACCEPTED',
                posts: {
                  $elemMatch: {
                    deletedAt: null,
                    id: id,
                  },
                },
                messageGroup: {
                  buyerOrganizationId: true,
                },
                buyer: {
                  id: true,
                  name: true,
                  picture: {
                    id: true,
                    path: true,
                  },
                },
                ordersItems: {
                  quantity: true,
                  integration: {
                    id: true,
                    name: true,
                    providerIdentifier: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const allOrders = offers?.users.flatMap((user) => user.user.orderSeller) || [];
    const onlyValidItems = allOrders.filter(
      (order) =>
        (order.posts.find((p) => p.id === id)
          ? 0
          : order.posts.filter((f) => f.approvedSubmitForOrder !== 'NO')
              .length) <
        order.ordersItems.reduce((acc, item) => acc + item.quantity, 0)
    );
    return onlyValidItems
      .map((order) => {
        const postsNumbers = order.posts
          .filter(
            (p) =>
              ['WAITING_CONFIRMATION', 'YES'].indexOf(
                p.approvedSubmitForOrder
              ) > -1
          )
          .reduce((acc, post) => {
            acc[post.integrationId] = acc[post.integrationId] + 1 || 1;
            return acc;
          }, {} as { [key: string]: number });
        const missing = order.ordersItems.map((item) => {
          return {
            integration: item,
            missing: item.quantity - (postsNumbers[item.integration.id] || 0),
          };
        });
        return {
          id: order.id,
          usedIds: order.posts.map((p) => ({
            id: p.id,
            status: p.approvedSubmitForOrder,
          })),
          buyer: order.buyer,
          missing,
        };
      })
      .filter((f) => f.missing.length);
  }

  async requestRevision(userId, orgId, postId, message) {
    const loadMessage = await MessagesModel.findOne({
      id: message,
      'group.buyerOrganizationId': orgId,
    }).select('id special');
    const post = await PostModel.findOne({
      id: postId,
      approvedSubmitForOrder: 'WAITING_CONFIRMATION',
      deletedAt: null,
    });
    if (post && loadMessage) {
      const special = JSON.parse(loadMessage.special);
      special.data.status = 'REVISION';
      await MessagesModel.updateOne(
        { id: message },
        { special: JSON.stringify(special) }
      );
      await PostModel.updateOne(
        { id: postId, deletedAt: null },
        { approvedSubmitForOrder: 'NO' }
      );
    }
  }

  async requestCancel(orgId, postId) {
    const getPost = await PostModel.findOne({
      id: postId,
      organizationId: orgId,
      approvedSubmitForOrder: {
        $in: ['WAITING_CONFIRMATION', 'YES'],
      },
    }).select('lastMessage');
    if (!getPost) {
      throw new Error('Post not found');
    }
    await PostModel.updateOne(
      { id: postId },
      {
        approvedSubmitForOrder: 'NO',
        submittedForOrganizationId: null,
      }
    );
    const special = JSON.parse(getPost.lastMessage.special);
    special.data.status = 'CANCELED';
    await MessagesModel.updateOne(
      { id: getPost.lastMessage.id },
      { special: JSON.stringify(special) }
    );
  }

  async requestApproved(userId, orgId, postId, message) {
    const loadMessage = await MessagesModel.findOne({
      id: message,
      'group.buyerOrganizationId': orgId,
    }).select('id special');
    const post = await PostModel.findOne({
      id: postId,
      approvedSubmitForOrder: 'WAITING_CONFIRMATION',
      deletedAt: null,
    });
    if (post && loadMessage) {
      const special = JSON.parse(loadMessage.special);
      special.data.status = 'APPROVED';
      await MessagesModel.updateOne(
        { id: message },
        { special: JSON.stringify(special) }
      );
      await PostModel.updateOne(
        { id: postId, deletedAt: null },
        { approvedSubmitForOrder: 'YES' }
      );
      return post;
    }
    return false;
  }

  completeOrder(orderId) {
    return OrdersModel.findByIdAndUpdate(orderId, {
      status: 'COMPLETED',
    });
  }

  async completeOrderAndPay(orgId, order) {
    const findOrder = await OrdersModel.findOne({
      id: order,
      'messageGroup.buyerOrganizationId': orgId,
    }).select('captureId seller ordersItems posts');
    if (!findOrder) {
      return false;
    }
    const releasedPosts = findOrder.posts.filter((p) => p.releaseURL);
    const nonReleasedPosts = findOrder.posts.filter((p) => !p.releaseURL);
    const totalPosts = releasedPosts.reduce((acc, item) => {
      acc[item.integrationId] = (acc[item.integrationId] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    const totalOrderItems = findOrder.ordersItems.reduce((acc, item) => {
      acc[item.integrationId] = (acc[item.integrationId] || 0) + item.quantity;
      return acc;
    }, {} as { [key: string]: number });
    const calculate = Object.keys(totalOrderItems).reduce((acc, key) => {
      acc.push({
        price: findOrder.ordersItems.find((p) => p.integrationId === key)!
          .price,
        quantity: totalOrderItems[key] - (totalPosts[key] || 0),
      });
      return acc;
    }, [] as { price: number; quantity: number }[]);
    const price = calculate.reduce((acc, item) => {
      acc += item.price * item.quantity;
      return acc;
    }, 0);
    return {
      price,
      account: findOrder.seller.account,
      charge: findOrder.captureId,
      posts: nonReleasedPosts,
      sellerId: findOrder.seller.id,
    };
  }

  payoutProblem(orderId, sellerId, amount, postId) {
    return PayoutProblemsModel.create({
      amount,
      orderId,
      ...(postId ? { postId } : {}),
      userId: sellerId,
      status: 'PAYMENT_ERROR',
    });
  }

  async getOrders(userId, orgId, type) {
    const orders = await OrdersModel.find({
      status: {
        $in: ['ACCEPTED', 'PENDING', 'COMPLETED'],
      },
      ...(type === 'seller'
        ? {
            sellerId: userId,
          }
        : {
            'messageGroup.buyerOrganizationId': orgId,
          }),
    })
      .sort({ updatedAt: -1 })
      .select({
        id: true,
        status: true,
        ...(type === 'seller'
          ? {
              buyer: {
                name: true,
              },
            }
          : {
              seller: {
                name: true,
              },
            }),
        ordersItems: {
          id: true,
          quantity: true,
          price: true,
          integration: {
            id: true,
            picture: true,
            name: true,
            providerIdentifier: true,
          },
        },
        posts: {
          id: true,
          integrationId: true,
          releaseURL: true,
          approvedSubmitForOrder: true,
          state: true,
        },
      });
    return {
      orders: await Promise.all(
        orders.map(async (order) => {
          return {
            id: order.id,
            status: order.status,
            // @ts-ignore
            name: type === 'seller' ? order?.buyer?.name : order?.seller?.name,
            price: order.ordersItems.reduce(
              (acc, item) => acc + item.price * item.quantity,
              0
            ),
            details: await Promise.all(
              order.ordersItems.map((item) => {
                return {
                  posted: order.posts.filter(
                    (p) =>
                      p.releaseURL && p.integrationId === item.integration.id
                  ).length,
                  submitted: order.posts.filter(
                    (p) =>
                      !p.releaseURL &&
                      (p.approvedSubmitForOrder === 'WAITING_CONFIRMATION' ||
                        p.approvedSubmitForOrder === 'YES') &&
                      p.integrationId === item.integration.id
                  ).length,
                  integration: item.integration,
                  total: item.quantity,
                  price: item.price,
                };
              })
            ),
          };
        })
      ),
    };
  }

  getPost(userId, orgId, postId) {
    return PostModel.findOne({
      id: postId,
      submittedForOrder: {
        $elemMatch: {
          $or: [{ sellerId: userId }, { buyerOrganizationId: orgId }],
        },
      },
    }).select({
      organizationId: true,
      integration: {
        providerIdentifier: true,
      },
    });
  }
}

module.exports = MessagesRepository;
