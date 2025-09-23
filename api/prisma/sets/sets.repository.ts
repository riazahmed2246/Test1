const SetsModel = require('../../models/sets.model');
const { v4: uuidv4 } = require('uuid');

class SetsRepository {
  async getTotal(orgId) {
    return SetsModel.countDocuments({ organizationId: orgId });
  }

  async getSets(orgId) {
    return SetsModel.find({ organizationId: orgId }).sort({ createdAt: -1 });
  }

  async deleteSet(orgId, id) {
    return SetsModel.deleteOne({ _id: id, organizationId: orgId });
  }

  async createSet(orgId, body) {
    const id = body.id || uuidv4();
    const set = await SetsModel.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      {
        name: body.name,
        content: body.content,
        organizationId: orgId,
      },
      { upsert: true, new: true }
    );
    return { id: set._id };
  }
}

module.exports = SetsRepository;