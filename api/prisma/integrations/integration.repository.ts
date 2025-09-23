import IntegrationModel from '../../models/integration.model';
import PostModel from '../../models/post.model';
import PlugModel from '../../models/plug.model';
import ExistingPlugDataModel from '../../models/existingPlugData.model';
import CustomerModel from '../../models/customer.model';
import MentionModel from '../../models/mention.model';

export class IntegrationRepository {
  async getMentions(platform: string, q: string) {
    return MentionModel.find({
      platform,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
      ],
    })
      .sort({ name: 1 })
      .limit(100)
      .select('name username image');
  }

  async insertMentions(platform: string, mentions: { name: string; username: string; image: string }[]) {
    if (!mentions.length) return [];
    return MentionModel.insertMany(
      mentions.map((mention) => ({ ...mention, platform })),
      { ordered: false }
    );
  }

  async checkPreviousConnections(org: string, id: string) {
    const findIt = await IntegrationModel.find({ rootInternalId: id.split('_').pop() }).select('organizationId id');
    if (findIt.some((f) => f.organizationId === org)) return false;
    return findIt.length > 0;
  }

  async updateProviderSettings(org: string, id: string, settings: string) {
    return IntegrationModel.findOneAndUpdate({ _id: id, organizationId: org }, { additionalSettings: settings });
  }

  async setTimes(org: string, id: string, times: any) {
    return IntegrationModel.findOneAndUpdate({ _id: id, organizationId: org }, { postingTimes: JSON.stringify(times.time) }, { new: true }).select('id');
  }

  async getPlug(plugId: string) {
    return PlugModel.findOne({ _id: plugId }).populate('integration');
  }

  async getPlugs(orgId: string, integrationId: string) {
    return PlugModel.find({ integrationId, organizationId: orgId, activated: true }).populate({ path: 'integration', select: 'id providerIdentifier' });
  }

  async updateIntegration(id: string, params: any) {
    if (params.picture && typeof params.picture === 'string') {
      // Add upload logic if needed
    }
    return IntegrationModel.findByIdAndUpdate(id, params, { new: true });
  }

  async disconnectChannel(org: string, id: string) {
    return IntegrationModel.findOneAndUpdate({ _id: id, organizationId: org }, { refreshNeeded: true });
  }

  async createOrUpdateIntegration(
    additionalSettings: any,
    oneTimeToken: boolean,
    org: string,
    name: string,
    picture: string | undefined,
    type: string,
    internalId: string,
    provider: string,
    token: string,
    refreshToken = '',
    expiresIn = 999999999,
    username?: string,
    isBetweenSteps = false,
    refresh?: string,
    timezone?: number,
    customInstanceDetails?: string
  ) {
    const postTimes = timezone
      ? JSON.stringify([
          { time: 560 - timezone },
          { time: 850 - timezone },
          { time: 1140 - timezone },
        ])
      : undefined;
    const update = {
      type,
      name,
      providerIdentifier: provider,
      token,
      profile: username,
      picture,
      inBetweenSteps: isBetweenSteps,
      refreshToken,
      tokenExpiration: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      internalId,
      postingTimes: postTimes,
      organizationId: org,
      refreshNeeded: false,
      rootInternalId: internalId.split('_').pop(),
      customInstanceDetails,
      additionalSettings: additionalSettings ? JSON.stringify(additionalSettings) : '[]',
      deletedAt: null,
    };
    let upsert = await IntegrationModel.findOneAndUpdate(
      { internalId, organizationId: org },
      update,
      { upsert: true, new: true }
    );
    if (oneTimeToken) {
      const rootId = (await IntegrationModel.findOne({ organizationId: org, internalId }))?.rootInternalId || internalId.split('_').pop();
      await IntegrationModel.updateMany(
        { _id: { $ne: upsert._id }, organizationId: org, rootInternalId: rootId },
        {
          token,
          refreshToken,
          refreshNeeded: false,
          tokenExpiration: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
        }
      );
    }
    return upsert;
  }

  async needsToBeRefreshed() {
    return IntegrationModel.find({
      tokenExpiration: { $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      inBetweenSteps: false,
      deletedAt: null,
      refreshNeeded: false,
    });
  }

  async refreshNeeded(org: string, id: string) {
    return IntegrationModel.findOneAndUpdate({ _id: id, organizationId: org }, { refreshNeeded: true });
  }

  async updateNameAndUrl(id: string, name: string, url: string) {
    const update: any = {};
    if (name) update.name = name;
    if (url) update.picture = url;
    return IntegrationModel.findByIdAndUpdate(id, update);
  }

  async getIntegrationById(org: string, id: string) {
    return IntegrationModel.findOne({ organizationId: org, _id: id });
  }

  async getIntegrationForOrder(id: string, order: string, user: string, org: string) {
    const post = await PostModel.findOne({
      integrationId: id,
      submittedForOrder: order,
      // Add messageGroup logic if needed
    }).populate({
      path: 'integration',
      select: 'id name picture inBetweenSteps providerIdentifier',
    });
    return post?.integration;
  }

  async updateOnCustomerName(org: string, id: string, name: string) {
    let customer = name ? await CustomerModel.findOne({ orgId: org, name }) : undefined;
    if (!customer && name) {
      customer = await CustomerModel.create({ name, orgId: org });
    }
    return IntegrationModel.findOneAndUpdate(
      { _id: id, organizationId: org },
      { customer: customer ? customer._id : null }
    );
  }

  async updateIntegrationGroup(org: string, id: string, group: string) {
    return IntegrationModel.findOneAndUpdate(
      { _id: id, organizationId: org },
      { customer: group ? group : null }
    );
  }

  async customers(orgId: string) {
    return CustomerModel.find({ orgId: orgId, deletedAt: null });
  }

  async getIntegrationsList(org: string) {
    return IntegrationModel.find({ organizationId: org, deletedAt: null }).populate('customer');
  }

  async disableChannel(org: string, id: string) {
    return IntegrationModel.findOneAndUpdate({ _id: id, organizationId: org }, { disabled: true });
  }

  async enableChannel(org: string, id: string) {
    return IntegrationModel.findOneAndUpdate({ _id: id, organizationId: org }, { disabled: false });
  }

  async getPostsForChannel(org: string, id: string) {
    return PostModel.aggregate([
      { $match: { organizationId: org, integrationId: id, deletedAt: null } },
      { $group: { _id: '$group' } },
    ]);
  }

  async deleteChannel(org: string, id: string) {
    return IntegrationModel.findOneAndUpdate({ _id: id, organizationId: org }, { deletedAt: new Date() });
  }

  async checkForDeletedOnceAndUpdate(org: string, page: string) {
    return IntegrationModel.updateMany(
      { organizationId: org, internalId: page, deletedAt: { $ne: null } },
      { internalId: 'new_' + Math.random().toString(36).substr(2, 10) }
    );
  }

  async disableIntegrations(org: string, totalChannels: number) {
    const getChannels = await IntegrationModel.find({ organizationId: org, disabled: false, deletedAt: null }).limit(totalChannels).select('_id');
    for (const channel of getChannels) {
      await IntegrationModel.findByIdAndUpdate(channel._id, { disabled: true });
    }
  }

  async getPlugsByIntegrationId(org: string, id: string) {
    return PlugModel.find({ organizationId: org, integrationId: id });
  }

  async createOrUpdatePlug(org: string, integrationId: string, body: any) {
    return PlugModel.findOneAndUpdate(
      { organizationId: org, integrationId, plugFunction: body.func },
      { data: JSON.stringify(body.fields), activated: true },
      { upsert: true, new: true }
    );
  }

  async changePlugActivation(orgId: string, plugId: string, status: boolean) {
    return PlugModel.findOneAndUpdate({ organizationId: orgId, _id: plugId }, { activated: !!status });
  }

  async loadExisingData(methodName: string, integrationId: string, id: string[]) {
    return ExistingPlugDataModel.find({ integrationId, methodName, value: { $in: id } });
  }

  async saveExisingData(methodName: string, integrationId: string, value: string[]) {
    return ExistingPlugDataModel.insertMany(
      value.map((p) => ({ integrationId, methodName, value: p }))
    );
  }

  async getPostingTimes(orgId: string, integrationsId?: string) {
    const query: any = { organizationId: orgId, disabled: false, deletedAt: null };
    if (integrationsId) query._id = integrationsId;
    return IntegrationModel.find(query).select('postingTimes');
  }
}
