import AutoPost from '../../models/autoPost.model';
import { v4 as uuidv4 } from 'uuid';

export class AutopostRepository {
  async getTotal(orgId: string) {
    return AutoPost.countDocuments({ organizationId: orgId, deletedAt: null });
  }

  async getAutoposts(orgId: string) {
    return AutoPost.find({ organizationId: orgId, deletedAt: null });
  }

  async deleteAutopost(orgId: string, id: string) {
    return AutoPost.findOneAndUpdate({ _id: id, organizationId: orgId }, { deletedAt: new Date() });
  }

  async getAutopost(id: string) {
    return AutoPost.findOne({ _id: id, deletedAt: null });
  }

  async updateUrl(id: string, url: string) {
    return AutoPost.findByIdAndUpdate(id, { lastUrl: url });
  }

  async changeActive(orgId: string, id: string, active: boolean) {
    return AutoPost.findOneAndUpdate({ _id: id, organizationId: orgId }, { active });
  }

  async createAutopost(orgId: string, body: typeof AutoPost.schema.obj, id?: string) {
    const upsertId = id || uuidv4();
    const update = {
      organizationId: orgId,
      url: body.url,
      title: body.title,
      integrations: JSON.stringify(body.integrations),
      active: body.active,
      content: body.content,
      generateContent: body.generateContent,
      addPicture: body.addPicture,
      syncLast: body.syncLast,
      onSlot: body.onSlot,
      lastUrl: body.lastUrl,
    };
    let autopost = await AutoPost.findOneAndUpdate(
      { _id: upsertId, organizationId: orgId },
      update,
      { upsert: true, new: true }
    );
    return { id: autopost._id, active: autopost.active };
  }
}
