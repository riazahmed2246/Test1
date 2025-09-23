import ItemUserModel from '../../models/itemUser.model';
import UserModel from '../../models/user.model';

class ItemUserRepository {
  async addOrRemoveItem(add, userId, item) {
    if (!add) {
      return ItemUserModel.deleteMany({
        user: userId,
        key: item,
      });
    }
    // Ensure user exists before adding item
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');
    return ItemUserModel.create({
      key: item,
      user: userId,
    });
  }

  async getItems(userId) {
    return ItemUserModel.find({ user: userId });
  }
}

module.exports = ItemUserRepository;
