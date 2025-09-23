const WebhooksModel = require('../../models/webhooks.model');
const { v4: uuidv4 } = require('uuid');

class WebhooksRepository {
  constructor(webhooksModel) {
    this._webhooks = webhooksModel || WebhooksModel;
  }

  async getTotal(orgId) {
    return this._webhooks.countDocuments({ organizationId: orgId, deletedAt: null });
  }

  async getWebhooks(orgId) {
    return this._webhooks.find({ organizationId: orgId, deletedAt: null })
      .populate({
        path: 'integrations',
        populate: {
          path: 'integration',
          select: 'id picture name',
        },
      });
  }

  async deleteWebhook(orgId, id) {
    return this._webhooks.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { deletedAt: new Date() },
      { new: true }
    );
  }

  async createWebhook(orgId, body) {
    const webhook = await this._webhooks.findOneAndUpdate(
      { _id: body.id || uuidv4(), organizationId: orgId },
      {
        organizationId: orgId,
        url: body.url,
        name: body.name,
      },
      { upsert: true, new: true }
    );
    webhook.integrations = body.integrations.map((integration) => ({ integrationId: integration.id }));
    await webhook.save();
    return { id: webhook._id };
  }
}

module.exports = WebhooksRepository;
