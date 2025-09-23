const SetsRepository = require('./sets.repository');

class SetsService {
  constructor(setsRepository) {
    this._setsRepository = setsRepository;
  }

  getTotal(orgId) {
    return this._setsRepository.getTotal(orgId);
  }

  getSets(orgId) {
    return this._setsRepository.getSets(orgId);
  }

  createSet(orgId, body) {
    return this._setsRepository.createSet(orgId, body);
  }

  deleteSet(orgId, id) {
    return this._setsRepository.deleteSet(orgId, id);
  }
}

module.exports = SetsService;