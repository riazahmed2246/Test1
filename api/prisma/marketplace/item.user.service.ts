const ItemUserRepository = require('./item.user.repository');

class ItemUserService {
  constructor(itemUserRepository) {
    this._itemUserRepository = itemUserRepository;
  }

  addOrRemoveItem(add, userId, item) {
    return this._itemUserRepository.addOrRemoveItem(add, userId, item);
  }

  getItems(userId) {
    return this._itemUserRepository.getItems(userId);
  }
}

module.exports = ItemUserService;
