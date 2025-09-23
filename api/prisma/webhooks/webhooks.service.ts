const WebhooksRepository = require('./webhooks.repository');
const PostsRepository = require('../posts/posts.repository');

class WebhooksService {
  constructor(webhooksRepository, postsRepository, workerServiceProducer, ioRedis) {
    this._webhooksRepository = webhooksRepository;
    this._postsRepository = postsRepository;
    this._workerServiceProducer = workerServiceProducer;
    this._ioRedis = ioRedis;
  }

  getTotal(orgId) {
    return this._webhooksRepository.getTotal(orgId);
  }

  getWebhooks(orgId) {
    return this._webhooksRepository.getWebhooks(orgId);
  }

  createWebhook(orgId, body) {
    return this._webhooksRepository.createWebhook(orgId, body);
  }

  deleteWebhook(orgId, id) {
    return this._webhooksRepository.deleteWebhook(orgId, id);
  }

  async digestWebhooks(orgId, since) {
    const date = new Date().toISOString();
    await this._ioRedis.watch('webhook_' + orgId);
    const value = await this._ioRedis.get('webhook_' + orgId);
    if (value) return;
    await this._ioRedis
      .multi()
      .set('webhook_' + orgId, date)
      .expire('webhook_' + orgId, 60)
      .exec();
    this._workerServiceProducer.emit('webhooks', {
      id: 'digest_' + orgId,
      options: { delay: 60000 },
      payload: { org: orgId, since },
    });
  }

  async fireWebhooks(orgId, since) {
    const list = await this._postsRepository.getPostsSince(orgId, since);
    const webhooks = await this._webhooksRepository.getWebhooks(orgId);
    const sendList = [];
    for (const webhook of webhooks) {
      const toSend = [];
      if (!webhook.integrations || webhook.integrations.length === 0) {
        toSend.push(...list);
      } else {
        toSend.push(
          ...list.filter((post) =>
            webhook.integrations.some(
              (i) => i.integration.id === post.integration.id
            )
          )
        );
      }
      if (toSend.length) {
        sendList.push({ url: webhook.url, data: toSend });
      }
    }
    return Promise.all(
      sendList.map(async (s) => {
        try {
          await fetch(s.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(s.data),
          });
        } catch (e) {}
      })
    );
  }
}

module.exports = WebhooksService;
