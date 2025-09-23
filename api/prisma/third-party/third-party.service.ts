const ThirdPartyRepository = require('./third-party.repository');

class ThirdPartyService {
  constructor(thirdPartyRepository) {
    this._thirdPartyRepository = thirdPartyRepository;
  }

  getAllThirdPartiesByOrganization(org) {
    return this._thirdPartyRepository.getAllThirdPartiesByOrganization(org);
  }

  deleteIntegration(org, id) {
    return this._thirdPartyRepository.deleteIntegration(org, id);
  }

  getIntegrationById(org, id) {
    return this._thirdPartyRepository.getIntegrationById(org, id);
  }

  saveIntegration(org, identifier, apiKey, data) {
    return this._thirdPartyRepository.saveIntegration(org, identifier, apiKey, data);
  }
}

module.exports = ThirdPartyService;
