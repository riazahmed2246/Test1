const pricing = require('./pricing');
const SubscriptionRepository = require('./subscription.repository');
const IntegrationService = require('../integrations/integration.service');
const OrganizationService = require('../organizations/organization.service');
const dayjs = require('dayjs');
const makeId = require('../../utils/makeId');

class SubscriptionService {
  constructor(subscriptionRepository, integrationService, organizationService) {
    this._subscriptionRepository = subscriptionRepository;
    this._integrationService = integrationService;
    this._organizationService = organizationService;
  }

  getSubscriptionByOrganizationId(organizationId) {
    return this._subscriptionRepository.getSubscriptionByOrganizationId(organizationId);
  }

  useCredit(organization, type = 'ai_images', func) {
    return this._subscriptionRepository.useCredit(organization, type, func);
  }

  getCode(code) {
    return this._subscriptionRepository.getCode(code);
  }

  updateAccount(userId, account) {
    return this._subscriptionRepository.updateAccount(userId, account);
  }

  getUserAccount(userId) {
    return this._subscriptionRepository.getUserAccount(userId);
  }

  async deleteSubscription(customerId) {
    await this.modifySubscription(customerId, pricing.FREE.channel || 0, 'FREE');
    return this._subscriptionRepository.deleteSubscriptionByCustomerId(customerId);
  }

  updateCustomerId(organizationId, customerId) {
    return this._subscriptionRepository.updateCustomerId(organizationId, customerId);
  }

  async checkSubscription(organizationId, subscriptionId) {
    return await this._subscriptionRepository.checkSubscription(organizationId, subscriptionId);
  }

  updateConnectedStatus(account, accountCharges) {
    return this._subscriptionRepository.updateConnectedStatus(account, accountCharges);
  }

  async modifySubscription(customerId, totalChannels, billing) {
    if (!customerId) return false;
    const getOrgByCustomerId = await this._subscriptionRepository.getOrganizationByCustomerId(customerId);
    const getCurrentSubscription = await this._subscriptionRepository.getSubscriptionByCustomerId(customerId);
    if (!getOrgByCustomerId || (getCurrentSubscription && getCurrentSubscription.isLifetime)) return false;
    const from = pricing[getCurrentSubscription?.subscriptionTier || 'FREE'];
    const to = pricing[billing];
    const currentTotalChannels = (await this._integrationService.getIntegrationsList(getOrgByCustomerId?._id)).filter((f) => !f.disabled);
    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(getOrgByCustomerId?._id, currentTotalChannels.length - totalChannels);
    }
    if (from.team_members && !to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(getOrgByCustomerId?._id, true);
    }
    if (!from.team_members && to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(getOrgByCustomerId?._id, false);
    }
    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(getOrgByCustomerId?._id);
    }
    return true;
  }

  async createOrUpdateSubscription(isTrailing, identifier, customerId, totalChannels, billing, period, cancelAt, code, org) {
    if (!code) {
      try {
        const load = await this.modifySubscription(customerId, totalChannels, billing);
        if (!load) return {};
      } catch (e) {
        return {};
      }
    }
    return this._subscriptionRepository.createOrUpdateSubscription(
      isTrailing,
      identifier,
      customerId,
      totalChannels,
      billing,
      period,
      cancelAt,
      code,
      org ? { _id: org } : undefined
    );
  }

  async getSubscription(organizationId) {
    return this._subscriptionRepository.getSubscription(organizationId);
  }

  async checkCredits(organization, checkType = 'ai_images') {
    const type = organization?.subscription?.subscriptionTier || 'FREE';
    if (type === 'FREE') return { credits: 0 };
    let date = dayjs(organization.subscription.createdAt);
    while (date.isBefore(dayjs())) {
      date = date.add(1, 'month');
    }
    const checkFromMonth = date.subtract(1, 'month');
    const imageGenerationCount = checkType === 'ai_images' ? pricing[type].image_generation_count : pricing[type].generate_videos;
    const totalUse = await this._subscriptionRepository.getCreditsFrom(organization._id, checkFromMonth, checkType);
    return { credits: imageGenerationCount - totalUse };
  }

  async lifeTime(orgId, identifier, subscription) {
    return this.createOrUpdateSubscription(
      false,
      identifier,
      identifier,
      pricing[subscription].channel,
      subscription,
      'YEARLY',
      null,
      identifier,
      orgId
    );
  }

  async addSubscription(orgId, userId, subscription) {
    await this._subscriptionRepository.setCustomerId(orgId, userId);
    return this.createOrUpdateSubscription(
      false,
      makeId(5),
      userId,
      pricing[subscription].channel,
      subscription,
      'MONTHLY',
      null,
      undefined,
      orgId
    );
  }
}

module.exports = SubscriptionService;
