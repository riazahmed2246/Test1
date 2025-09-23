const MediaModel = require('../../models/media.model');

class MediaRepository {
  async saveFile(org, fileName, filePath) {
    return MediaModel.create({
      organizationId: org,
      name: fileName,
      path: filePath,
    });
  }

  async getMediaById(id) {
    return MediaModel.findById(id);
  }

  async deleteMedia(org, id) {
    return MediaModel.findOneAndUpdate(
      { _id: id, organizationId: org },
      { deletedAt: new Date() }
    );
  }

  async saveMediaInformation(org, data) {
    return MediaModel.findOneAndUpdate(
      { _id: data.id, organizationId: org },
      {
        alt: data.alt,
        thumbnail: data.thumbnail,
        thumbnailTimestamp: data.thumbnailTimestamp,
      },
      { new: true }
    );
  }

  async getMedia(org, page) {
    const pageNum = (page || 1) - 1;
    const query = { organizationId: org, deletedAt: null };
    const total = await MediaModel.countDocuments(query);
    const pages = pageNum === 0 ? Math.ceil(total / 28) : 0;
    const results = await MediaModel.find(query)
      .sort({ createdAt: -1 })
      .skip(pageNum * 28)
      .limit(28);
    return { pages, results };
  }
}

module.exports = MediaRepository;
