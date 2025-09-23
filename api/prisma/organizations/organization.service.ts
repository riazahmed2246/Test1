const OrganizationRepository = require('./organization.repository');
const NotificationService = require('../notifications/notification.service');
const dayjs = require('dayjs');
const { makeId } = require('../../services/make.is');
const AuthService = require('../../helpers/auth/auth.service');

class OrganizationService {
  constructor(organizationRepository, notificationsService) {
    this._organizationRepository = organizationRepository;
    this._notificationsService = notificationsService;
  }

  async createOrgAndUser(body, ip, userAgent) {
    return this._organizationRepository.createOrgAndUser(
      body,
      this._notificationsService.hasEmailProvider(),
      ip,
      userAgent
    );
  }

  async getCount() {
    return this._organizationRepository.getCount();
  }

  addUserToOrg(userId, id, orgId, role) {
    return this._organizationRepository.addUserToOrg(userId, id, orgId, role);
  }

  getOrgById(id) {
    return this._organizationRepository.getOrgById(id);
  }

  getOrgByApiKey(api) {
    return this._organizationRepository.getOrgByApiKey(api);
  }

  getUserOrg(id) {
    return this._organizationRepository.getUserOrg(id);
  }

  getOrgsByUserId(userId) {
    return this._organizationRepository.getOrgsByUserId(userId);
  }

  updateApiKey(orgId) {
    return this._organizationRepository.updateApiKey(orgId);
  }

  getTeam(orgId) {
    return this._organizationRepository.getTeam(orgId);
  }

  getOrgByCustomerId(customerId) {
    return this._organizationRepository.getOrgByCustomerId(customerId);
  }

  async inviteTeamMember(orgId, body) {
    const timeLimit = dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
    const id = makeId(5);
    const url =
      process.env.FRONTEND_URL +
      `/?org=${AuthService.signJWT({ ...body, orgId, timeLimit, id })}`;
    if (body.sendEmail) {
      await this._notificationsService.sendEmail(
        body.email,
        'You have been invited to join an organization',
        `You have been invited to join an organization. Click <a href="${url}">here</a> to join.<br />The link will expire in 1 hour.`
      );
    }
    return { url };
  }

  async deleteTeamMember(org, userId) {
    const userOrgs = await this._organizationRepository.getOrgsByUserId(userId);
    const findOrgToDelete = userOrgs.find((orgUser) => orgUser.id === org.id);
    if (!findOrgToDelete) {
      throw new Error('User is not part of this organization');
    }
    // @ts-ignore
    const myRole = org.users[0].role;
    const userRole = findOrgToDelete.users[0].role;
    const myLevel = myRole === 'USER' ? 0 : myRole === 'ADMIN' ? 1 : 2;
    const userLevel = userRole === 'USER' ? 0 : userRole === 'ADMIN' ? 1 : 2;
    if (myLevel < userLevel) {
      throw new Error('You do not have permission to delete this user');
    }
    return this._organizationRepository.deleteTeamMember(org.id, userId);
  }

  disableOrEnableNonSuperAdminUsers(orgId, disable) {
    return this._organizationRepository.disableOrEnableNonSuperAdminUsers(orgId, disable);
  }
}

module.exports = OrganizationService;
