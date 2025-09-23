const SignaturesModel = require('../../models/signatures.model');
const { v4: uuidv4 } = require('uuid');

class SignatureRepository {
  async getSignaturesByOrgId(orgId) {
    return SignaturesModel.find({ organizationId: orgId, deletedAt: null });
  }

  async getDefaultSignature(orgId) {
    return SignaturesModel.findOne({ organizationId: orgId, autoAdd: true, deletedAt: null });
  }

  async createOrUpdateSignature(orgId, signature, id) {
    const values = {
      organizationId: orgId,
      content: signature.content,
      autoAdd: signature.autoAdd,
    };
    const updated = await SignaturesModel.findOneAndUpdate(
      { _id: id || uuidv4(), organizationId: orgId },
      values,
      { upsert: true, new: true }
    );
    if (values.autoAdd) {
      await SignaturesModel.updateMany(
        { organizationId: orgId, _id: { $ne: updated._id } },
        { autoAdd: false }
      );
    }
    return { id: updated._id };
  }

  async deleteSignature(orgId, id) {
    return SignaturesModel.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { deletedAt: new Date() }
    );
  }
}

module.exports = SignatureRepository;
