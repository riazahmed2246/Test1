const ThirdPartyModel = require('../../models/thirdParty.model');
const AuthService = require('../../helpers/auth/auth.service');

class ThirdPartyRepository {
  constructor(thirdPartyModel) {
    this._thirdParty = thirdPartyModel || ThirdPartyModel;
  }

  async getAllThirdPartiesByOrganization(org) {
    return this._thirdParty.find({ organizationId: org, deletedAt: null }, 'id name identifier');
  }

  async deleteIntegration(org, id) {
    return this._thirdParty.findOneAndUpdate(
      { _id: id, organizationId: org },
      { deletedAt: new Date() },
      { new: true }
    );
  }

  async getIntegrationById(org, id) {
    return this._thirdParty.findOne({ _id: id, organizationId: org, deletedAt: null });
  }

  async saveIntegration(org, identifier, apiKey, data) {
    return this._thirdParty.findOneAndUpdate(
      { internalId: data.id, organizationId: org },
      {
        organizationId: org,
        name: data.name,
        internalId: data.id,
        identifier,
        apiKey: AuthService.fixedEncryption(apiKey),
        deletedAt: null,
      },
      { upsert: true, new: true }
    );
  }
}

module.exports = ThirdPartyRepository;
