const UserModel = require('../../models/user.model');
const AuthService = require('../../helpers/auth/auth.service');
const allTagsOptions = require('../../models/tags.list');

class UsersRepository {
  constructor(userModel) {
    this._user = userModel || UserModel;
  }

  async getImpersonateUser(name) {
    return this._user.find({
      $or: [
        { name: { $regex: name, $options: 'i' } },
        { email: { $regex: name, $options: 'i' } },
        { _id: { $regex: name, $options: 'i' } },
      ],
    }, 'id name email').limit(10);
  }

  async getUserById(id) {
    return this._user.findById(id);
  }

  async getUserByEmail(email) {
    return this._user.findOne({ email, providerName: 'LOCAL' }).populate('picture', 'id path');
  }

  async activateUser(id) {
    return this._user.findByIdAndUpdate(id, { activated: true }, { new: true });
  }

  async getUserByProvider(providerId, provider) {
    return this._user.findOne({ providerId, providerName: provider });
  }

  async updatePassword(id, password) {
    return this._user.findOneAndUpdate(
      { _id: id, providerName: 'LOCAL' },
      { password: AuthService.hashPassword(password) },
      { new: true }
    );
  }

  async changeAudienceSize(userId, audience) {
    return this._user.findByIdAndUpdate(userId, { audience }, { new: true });
  }

  async changeMarketplaceActive(userId, active) {
    return this._user.findByIdAndUpdate(userId, { marketplace: active }, { new: true });
  }

  async getPersonal(userId) {
    return this._user.findById(userId, 'id name bio picture').populate('picture', 'id path');
  }

  async changePersonal(userId, body) {
    const update = {
      name: body.fullname,
      bio: body.bio,
      picture: body.picture ? body.picture.id : null,
    };
    return this._user.findByIdAndUpdate(userId, update, { new: true });
  }

  async getMarketplacePeople(orgId, userId, items) {
    const info = {
      _id: { $ne: userId },
      account: { $ne: null },
      connectedAccount: true,
      marketplace: true,
      items: {
        $elemMatch: {
          $or: (items.items.length
            ? items.items.map((key) => ({ key }))
            : allTagsOptions.map((p) => ({ key: p.key })))
        },
      },
    };
    const list = await this._user.find(info, {
      id: 1,
      name: 1,
      bio: 1,
      audience: 1,
      picture: 1,
      organizations: 1,
      items: 1,
    })
      .skip((items.page - 1) * 8)
      .limit(8)
      .populate('picture', 'id path');
    const count = await this._user.countDocuments(info);
    return { list, count };
  }
}

module.exports = UsersRepository;
