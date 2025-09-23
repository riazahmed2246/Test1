const SubscriptionModel = require('../../models/subscription.model');
const OrganizationModel = require('../../models/organization.model');
const UserModel = require('../../models/user.model');
const CreditsModel = require('../../models/credits.model');
const UsedCodesModel = require('../../models/usedCodes.model');
const dayjs = require('dayjs');

class SubscriptionRepository {
  async getUserAccount(userId) {
    return UserModel.findOne({ _id: userId }, 'account connectedAccount');
  }

  async getCode(code) {
    return UsedCodesModel.findOne({ code });
  }

  async updateAccount(userId, account) {
    return UserModel.findByIdAndUpdate(userId, { account }, { new: true });
  }

  async getSubscriptionByOrganizationId(organizationId) {
    return SubscriptionModel.findOne({ organizationId, deletedAt: null });
  }

  async updateConnectedStatus(account, accountCharges) {
    return UserModel.updateMany({ account }, { connectedAccount: accountCharges });
  }

  async getCustomerIdByOrgId(organizationId) {
    return OrganizationModel.findOne({ _id: organizationId }, 'paymentId');
  }

  async checkSubscription(organizationId, subscriptionId) {
    return SubscriptionModel.findOne({ organizationId, identifier: subscriptionId, deletedAt: null });
  }

  async deleteSubscriptionByCustomerId(customerId) {
    return SubscriptionModel.deleteMany({ customerId });
  }

  async updateCustomerId(organizationId, customerId) {
    return OrganizationModel.findByIdAndUpdate(organizationId, { paymentId: customerId }, { new: true });
  }

  async getSubscriptionByCustomerId(customerId) {
    return SubscriptionModel.findOne({ customerId });
  }

  async getOrganizationByCustomerId(customerId) {
    return OrganizationModel.findOne({ paymentId: customerId });
  }

  async createOrUpdateSubscription(isTrailing, identifier, customerId, totalChannels, billing, period, cancelAt, code, org) {
    const findOrg = org || (await this.getOrganizationByCustomerId(customerId));
    if (!findOrg) return;
    await SubscriptionModel.findOneAndUpdate(
      { organizationId: findOrg._id },
      {
        subscriptionTier: billing,
        totalChannels,
        period,
        identifier,
        isLifetime: !!code,
        cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
        deletedAt: null,
      },
      { upsert: true, new: true }
    );
    await OrganizationModel.findByIdAndUpdate(findOrg._id, { isTrailing, allowTrial: false });
    if (code) {
      await UsedCodesModel.create({ code, orgId: findOrg._id });
    }
  }

  async getSubscription(organizationId) {
    return SubscriptionModel.findOne({ organizationId, deletedAt: null });
  }

  async getCreditsFrom(organizationId, from, type = 'ai_images') {
    const load = await CreditsModel.aggregate([
      { $match: { organizationId, type, createdAt: { $gte: from.toDate() } } },
      { $group: { _id: '$organizationId', credits: { $sum: '$credits' } } }
    ]);
    return load?.[0]?.credits || 0;
  }

  async useCredit(org, type = 'ai_images', func) {
    const data = await CreditsModel.create({ organizationId: org._id, credits: 1, type });
    try {
      return await func();
    } catch (err) {
      await CreditsModel.findByIdAndDelete(data._id);
      throw err;
    }
  }

  async setCustomerId(orgId, customerId) {
    return OrganizationModel.findByIdAndUpdate(orgId, { paymentId: customerId }, { new: true });
  }
}

module.exports = SubscriptionRepository;
