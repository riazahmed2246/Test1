const SignatureRepository = require('./signature.repository');

class SignatureService {
  constructor(signatureRepository) {
    this._signatureRepository = signatureRepository;
  }

  getSignaturesByOrgId(orgId) {
    return this._signatureRepository.getSignaturesByOrgId(orgId);
  }

  getDefaultSignature(orgId) {
    return this._signatureRepository.getDefaultSignature(orgId);
  }

  createOrUpdateSignature(orgId, signature, id) {
    return this._signatureRepository.createOrUpdateSignature(orgId, signature, id);
  }

  deleteSignature(orgId, id) {
    return this._signatureRepository.deleteSignature(orgId, id);
  }
}

module.exports = SignatureService;
