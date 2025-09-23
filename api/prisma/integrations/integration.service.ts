import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { difference, uniq } from 'lodash';
// Import your converted repositories and managers
const UploadFactory = require('../../upload/upload.factory');
const IntegrationRepository = require('./integration.repository');
const AutopostRepository = require('../autopost/autopost.repository');

class IntegrationService {
  constructor(
    integrationRepository,
    autopostsRepository,
    integrationManager,
    notificationService,
    workerServiceProducer
  ) {
    this._integrationRepository = integrationRepository;
    this._autopostsRepository = autopostsRepository;
    this._integrationManager = integrationManager;
    this._notificationService = notificationService;
    this._workerServiceProducer = workerServiceProducer;
    this.storage = UploadFactory.createStorage();
  }

  async changeActiveCron(orgId) {
    const data = await this._autopostsRepository.getAutoposts(orgId);
    for (const item of data.filter((f) => f.active)) {
      await this._workerServiceProducer.deleteScheduler('cron', item.id);
    }
    return true;
  }

  getMentions(platform, q) {
    return this._integrationRepository.getMentions(platform, q);
  }

  insertMentions(platform, mentions) {
    return this._integrationRepository.insertMentions(platform, mentions);
  }

  async setTimes(orgId, integrationId, times) {
    return this._integrationRepository.setTimes(orgId, integrationId, times);
  }

  updateProviderSettings(org, id, additionalSettings) {
    return this._integrationRepository.updateProviderSettings(org, id, additionalSettings);
  }

  checkPreviousConnections(org, id) {
    return this._integrationRepository.checkPreviousConnections(org, id);
  }

  async createOrUpdateIntegration(
    additionalSettings,
    oneTimeToken,
    org,
    name,
    picture,
    type,
    internalId,
    provider,
    token,
    refreshToken = '',
    expiresIn,
    username,
    isBetweenSteps = false,
    refresh,
    timezone,
    customInstanceDetails
  ) {
    const uploadedPicture = picture
      ? picture?.indexOf('imagedelivery.net') > -1
        ? picture
        : await this.storage.uploadSimple(picture)
      : undefined;
    return this._integrationRepository.createOrUpdateIntegration(
      additionalSettings,
      oneTimeToken,
      org,
      name,
      uploadedPicture,
      type,
      internalId,
      provider,
      token,
      refreshToken,
      expiresIn,
      username,
      isBetweenSteps,
      refresh,
      timezone,
      customInstanceDetails
    );
  }

  updateIntegrationGroup(org, id, group) {
    return this._integrationRepository.updateIntegrationGroup(org, id, group);
  }

  updateOnCustomerName(org, id, name) {
    return this._integrationRepository.updateOnCustomerName(org, id, name);
  }

  getIntegrationsList(org) {
    return this._integrationRepository.getIntegrationsList(org);
  }

  getIntegrationForOrder(id, order, user, org) {
    return this._integrationRepository.getIntegrationForOrder(id, order, user, org);
  }

  updateNameAndUrl(id, name, url) {
    return this._integrationRepository.updateNameAndUrl(id, name, url);
  }

  getIntegrationById(org, id) {
    return this._integrationRepository.getIntegrationById(org, id);
  }

  async refreshToken(provider, refresh) {
    try {
      const { refreshToken, accessToken, expiresIn } = await provider.refreshToken(refresh);
      if (!refreshToken || !accessToken || !expiresIn) {
        return false;
      }
      return { refreshToken, accessToken, expiresIn };
    } catch (e) {
      return false;
    }
  }

  async disconnectChannel(orgId, integration) {
    await this._integrationRepository.disconnectChannel(orgId, integration.id);
    await this.informAboutRefreshError(orgId, integration);
  }

  async informAboutRefreshError(orgId, integration, err = '') {
    await this._notificationService.inAppNotification(
      orgId,
      `Could not refresh your ${integration.providerIdentifier} channel ${err}`,
      `Could not refresh your ${integration.providerIdentifier} channel ${err}. Please go back to the system and connect it again`,
      true
    );
  }

  async refreshNeeded(org, id) {
    return this._integrationRepository.refreshNeeded(org, id);
  }

  async refreshTokens() {
    const integrations = await this._integrationRepository.needsToBeRefreshed();
    for (const integration of integrations) {
      const provider = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
      const data = await this.refreshToken(provider, integration.refreshToken);
      if (!data) {
        await this.informAboutRefreshError(integration.organizationId, integration);
        await this._integrationRepository.refreshNeeded(integration.organizationId, integration.id);
        return;
      }
      const { refreshToken, accessToken, expiresIn } = data;
      await this.createOrUpdateIntegration(
        undefined,
        !!provider.oneTimeToken,
        integration.organizationId,
        integration.name,
        undefined,
        'social',
        integration.internalId,
        integration.providerIdentifier,
        accessToken,
        refreshToken,
        expiresIn
      );
    }
  }

  async disableChannel(org, id) {
    return this._integrationRepository.disableChannel(org, id);
  }

  async enableChannel(org, totalChannels, id) {
    const integrations = (await this._integrationRepository.getIntegrationsList(org)).filter((f) => !f.disabled);
    // Add your own logic for max channels if needed
    return this._integrationRepository.enableChannel(org, id);
  }

  async getPostsForChannel(org, id) {
    return this._integrationRepository.getPostsForChannel(org, id);
  }

  async deleteChannel(org, id) {
    return this._integrationRepository.deleteChannel(org, id);
  }

  async disableIntegrations(org, totalChannels) {
    return this._integrationRepository.disableIntegrations(org, totalChannels);
  }

  async checkForDeletedOnceAndUpdate(org, page) {
    return this._integrationRepository.checkForDeletedOnceAndUpdate(org, page);
  }

  async saveInstagram(org, id, data) {
    const getIntegration = await this._integrationRepository.getIntegrationById(org, id);
    if (getIntegration && !getIntegration.inBetweenSteps) {
      throw new Error('Invalid request');
    }
    const instagram = this._integrationManager.getSocialIntegration('instagram');
    const getIntegrationInformation = await instagram.fetchPageInformation(getIntegration?.token, data);
    await this.checkForDeletedOnceAndUpdate(org, getIntegrationInformation.id);
    await this._integrationRepository.updateIntegration(id, {
      picture: getIntegrationInformation.picture,
      internalId: getIntegrationInformation.id,
      name: getIntegrationInformation.name,
      inBetweenSteps: false,
      token: getIntegrationInformation.access_token,
      profile: getIntegrationInformation.username,
    });
    return { success: true };
  }

  async saveLinkedin(org, id, page) {
    const getIntegration = await this._integrationRepository.getIntegrationById(org, id);
    if (getIntegration && !getIntegration.inBetweenSteps) {
      throw new Error('Invalid request');
    }
    const linkedin = this._integrationManager.getSocialIntegration('linkedin-page');
    const getIntegrationInformation = await linkedin.fetchPageInformation(getIntegration?.token, page);
    await this.checkForDeletedOnceAndUpdate(org, String(getIntegrationInformation.id));
    await this._integrationRepository.updateIntegration(String(id), {
      picture: getIntegrationInformation.picture,
      internalId: String(getIntegrationInformation.id),
      name: getIntegrationInformation.name,
      inBetweenSteps: false,
      token: getIntegrationInformation.access_token,
      profile: getIntegrationInformation.username,
    });
    return { success: true };
  }

  async saveFacebook(org, id, page) {
    const getIntegration = await this._integrationRepository.getIntegrationById(org, id);
    if (getIntegration && !getIntegration.inBetweenSteps) {
      throw new Error('Invalid request');
    }
    const facebook = this._integrationManager.getSocialIntegration('facebook');
    const getIntegrationInformation = await facebook.fetchPageInformation(getIntegration?.token, page);
    await this.checkForDeletedOnceAndUpdate(org, getIntegrationInformation.id);
    await this._integrationRepository.updateIntegration(id, {
      picture: getIntegrationInformation.picture,
      internalId: getIntegrationInformation.id,
      name: getIntegrationInformation.name,
      inBetweenSteps: false,
      token: getIntegrationInformation.access_token,
      profile: getIntegrationInformation.username,
    });
    return { success: true };
  }

  async checkAnalytics(org, integration, date, forceRefresh = false) {
    const getIntegration = await this.getIntegrationById(org.id, integration);
    if (!getIntegration) {
      throw new Error('Invalid integration');
    }
    if (getIntegration.type !== 'social') {
      return [];
    }
    const integrationProvider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
    if (dayjs(getIntegration?.tokenExpiration).isBefore(dayjs()) || forceRefresh) {
      const { accessToken, expiresIn, refreshToken, additionalSettings } = await integrationProvider.refreshToken(getIntegration.refreshToken);
      if (accessToken) {
        await this.createOrUpdateIntegration(
          additionalSettings,
          !!integrationProvider.oneTimeToken,
          getIntegration.organizationId,
          getIntegration.name,
          getIntegration.picture,
          'social',
          getIntegration.internalId,
          getIntegration.providerIdentifier,
          accessToken,
          refreshToken,
          expiresIn
        );
        getIntegration.token = accessToken;
        if (integrationProvider.refreshWait) {
          await new Promise((res) => setTimeout(res, 10000));
        }
      } else {
        await this.disconnectChannel(org.id, getIntegration);
        return [];
      }
    }
    // Add your own Redis logic here if needed
    if (integrationProvider.analytics) {
      try {
        const loadAnalytics = await integrationProvider.analytics(getIntegration.internalId, getIntegration.token, +date);
        return loadAnalytics;
      } catch (e) {
        // Add your own error handling
      }
    }
    return [];
  }

  customers(orgId) {
    return this._integrationRepository.customers(orgId);
  }

  getPlugsByIntegrationId(org, integrationId) {
    return this._integrationRepository.getPlugsByIntegrationId(org, integrationId);
  }

  async processInternalPlug(data, forceRefresh = false) {
    const originalIntegration = await this._integrationRepository.getIntegrationById(data.orgId, data.originalIntegration);
    const getIntegration = await this._integrationRepository.getIntegrationById(data.orgId, data.integration);
    if (!getIntegration || !originalIntegration) {
      return;
    }
    const getAllInternalPlugs = this._integrationManager.getInternalPlugs(getIntegration.providerIdentifier).internalPlugs.find((p) => p.identifier === data.plugName);
    if (!getAllInternalPlugs) {
      return;
    }
    const getSocialIntegration = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
    if (dayjs(getIntegration?.tokenExpiration).isBefore(dayjs()) || forceRefresh) {
      const { accessToken, expiresIn, refreshToken, additionalSettings } = await getSocialIntegration.refreshToken(getIntegration.refreshToken);
      if (!accessToken) {
        await this.refreshNeeded(getIntegration.organizationId, getIntegration.id);
        await this.informAboutRefreshError(getIntegration.organizationId, getIntegration);
        return {};
      }
      await this.createOrUpdateIntegration(
        additionalSettings,
        !!getSocialIntegration.oneTimeToken,
        getIntegration.organizationId,
        getIntegration.name,
        getIntegration.picture,
        'social',
        getIntegration.internalId,
        getIntegration.providerIdentifier,
        accessToken,
        refreshToken,
        expiresIn
      );
      getIntegration.token = accessToken;
      if (getSocialIntegration.refreshWait) {
        await new Promise((res) => setTimeout(res, 10000));
      }
    }
    try {
      await getSocialIntegration[getAllInternalPlugs.methodName](getIntegration, originalIntegration, data.post, data.information);
    } catch (err) {
      // Add your own error handling
      return;
    }
  }

  async processPlugs(data) {
    const getPlugById = await this._integrationRepository.getPlug(data.plugId);
    if (!getPlugById) {
      return;
    }
    const integration = this._integrationManager.getSocialIntegration(getPlugById.integration.providerIdentifier);
    const findPlug = this._integrationManager.getAllPlugs().find((p) => p.identifier === getPlugById.integration.providerIdentifier);
    await integration[getPlugById.plugFunction](getPlugById.integration, data.postId, JSON.parse(getPlugById.data).reduce((all, current) => {
      all[current.name] = current.value;
      return all;
    }, {}));
    if (data.totalRuns === data.currentRun) {
      return;
    }
    this._workerServiceProducer.emit('plugs', {
      id: 'plug_' + data.postId + '_' + findPlug.identifier,
      options: {
        delay: data.delay,
      },
      payload: {
        plugId: data.plugId,
        postId: data.postId,
        delay: data.delay,
        totalRuns: data.totalRuns,
        currentRun: data.currentRun + 1,
      },
    });
  }

  async createOrUpdatePlug(orgId, integrationId, body) {
    const { activated } = await this._integrationRepository.createOrUpdatePlug(orgId, integrationId, body);
    return { activated };
  }

  async changePlugActivation(orgId, plugId, status) {
    const { id } = await this._integrationRepository.changePlugActivation(orgId, plugId, status);
    return { id };
  }

  async getPlugs(orgId, integrationId) {
    return this._integrationRepository.getPlugs(orgId, integrationId);
  }

  async loadExisingData(methodName, integrationId, id) {
    const exisingData = await this._integrationRepository.loadExisingData(methodName, integrationId, id);
    const loadOnlyIds = exisingData.map((p) => p.value);
    return difference(id, loadOnlyIds);
  }

  async findFreeDateTime(orgId, integrationsId) {
    const findTimes = await this._integrationRepository.getPostingTimes(orgId, integrationsId);
    return uniq(findTimes.reduce((all, current) => {
      return [
        ...all,
        ...JSON.parse(current.postingTimes).map((p) => p.time),
      ];
    }, []));
  }
}

module.exports = IntegrationService;
