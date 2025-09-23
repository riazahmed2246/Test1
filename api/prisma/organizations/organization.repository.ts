const OrganizationModel = require('../../models/organization.model');
const UserOrgModel = require('../../models/userOrganization.model');
const UserModel = require('../../models/user.model');
const { makeId } = require('../../services/make.is');
const AuthService = require('../../helpers/auth/auth.service');

class OrganizationRepository {
  async getOrgByApiKey(api) {
    return OrganizationModel.findOne({ apiKey: api }).populate('subscription');
  }

  async getCount() {
    return OrganizationModel.countDocuments();
  }

  async getUserOrg(id) {
    return UserOrgModel.findById(id).populate({
      path: 'user organization',
      populate: [
        {
          path: 'users',
          select: 'id disabled role userId',
        },
        {
          path: 'subscription',
          select: 'subscriptionTier totalChannels isLifetime',
        },
      ],
    });
  }

  async getImpersonateUser(name) {
    return UserOrgModel.find({
      $or: [
        { 'user.name': { $regex: name, $options: 'i' } },
        { 'user.email': { $regex: name, $options: 'i' } },
        { 'user.id': { $regex: name, $options: 'i' } },
      ],
    }).populate('organization user');
  }

  async updateApiKey(orgId) {
    return OrganizationModel.findByIdAndUpdate(orgId, {
      apiKey: AuthService.fixedEncryption(makeId(20)),
    });
  }

  async getOrgsByUserId(userId) {
    return OrganizationModel.find({ 'users.userId': userId })
      .populate({
        path: 'users',
        match: { userId },
        select: 'disabled role',
      })
      .populate('subscription');
  }

  async getOrgById(id) {
    return OrganizationModel.findById(id);
  }

  async addUserToOrg(userId, id, orgId, role) {
    const checkIfInviteExists = await UserModel.findOne({ inviteId: id });
    if (checkIfInviteExists) return false;
    const checkForSubscription = await OrganizationModel.findById(orgId).populate('subscription');
    if (process.env.STRIPE_PUBLISHABLE_KEY && checkForSubscription?.subscription?.subscriptionTier === 'STANDARD') {
      return false;
    }
    const create = await UserOrgModel.create({ role, userId, organizationId: orgId });
    await UserModel.findByIdAndUpdate(userId, { inviteId: id });
    return create;
  }

  async createOrgAndUser(body, hasEmail, ip, userAgent) {
    return OrganizationModel.create({
      name: body.company,
      apiKey: AuthService.fixedEncryption(makeId(20)),
      allowTrial: true,
      isTrailing: true,
      users: [{
        role: 'SUPERADMIN',
        user: {
          activated: body.provider !== 'LOCAL' || !hasEmail,
          email: body.email,
          password: body.password ? AuthService.hashPassword(body.password) : '',
          providerName: body.provider,
          providerId: body.providerId || '',
          timezone: 0,
          ip,
          agent: userAgent,
        },
      }],
    });
  }

  async getOrgByCustomerId(customerId) {
    return OrganizationModel.findOne({ paymentId: customerId });
  }

  async getTeam(orgId) {
    return OrganizationModel.findById(orgId).populate({
      path: 'users',
      populate: {
        path: 'user',
        select: 'email id',
      },
      select: 'role',
    });
  }

  async getAllUsersOrgs(orgId) {
    return OrganizationModel.findById(orgId).populate({
      path: 'users',
      populate: {
        path: 'user',
        select: 'email id',
      },
    });
  }

  async deleteTeamMember(orgId, userId) {
    return UserOrgModel.deleteOne({ userId, organizationId: orgId });
  }

  async disableOrEnableNonSuperAdminUsers(orgId, disable) {
    return UserOrgModel.updateMany({
      organizationId: orgId,
      role: { $ne: 'SUPERADMIN' },
    }, {
      disabled: disable,
    });
  }
}

module.exports = OrganizationRepository;
