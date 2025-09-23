const UsersRepository = require('./users.repository');
const OrganizationRepository = require('../organizations/organization.repository');

class UsersService {
  constructor(usersRepository, organizationRepository) {
    this._usersRepository = usersRepository;
    this._organizationRepository = organizationRepository;
  }

  getUserByEmail(email) {
    return this._usersRepository.getUserByEmail(email);
  }

  getUserById(id) {
    return this._usersRepository.getUserById(id);
  }

  getImpersonateUser(name) {
    return this._organizationRepository.getImpersonateUser(name);
  }

  getUserByProvider(providerId, provider) {
    return this._usersRepository.getUserByProvider(providerId, provider);
  }

  activateUser(id) {
    return this._usersRepository.activateUser(id);
  }

  updatePassword(id, password) {
    return this._usersRepository.updatePassword(id, password);
  }

  changeAudienceSize(userId, audience) {
    return this._usersRepository.changeAudienceSize(userId, audience);
  }

  changeMarketplaceActive(userId, active) {
    return this._usersRepository.changeMarketplaceActive(userId, active);
  }

  getMarketplacePeople(orgId, userId, body) {
    return this._usersRepository.getMarketplacePeople(orgId, userId, body);
  }

  getPersonal(userId) {
    return this._usersRepository.getPersonal(userId);
  }

  changePersonal(userId, body) {
    return this._usersRepository.changePersonal(userId, body);
  }
}

module.exports = UsersService;
