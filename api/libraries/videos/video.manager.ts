const { VideoAbstract, VideoParams } = require('./video.interface');

// Example: Registry for available video classes
const videoRegistry = [];
// Populate videoRegistry with your video classes and params
// Example: videoRegistry.push({ identifier: 'example', target: ExampleVideoClass, ...params })

class VideoManager {
  constructor() {
    // No DI, manual instantiation if needed
  }

  getAllVideos() {
    return videoRegistry.filter((f) => f.available).map((p) => ({
      identifier: p.identifier,
      title: p.title,
      description: p.description,
      placement: p.placement,
      trial: p.trial,
    }));
  }

  checkAvailableVideoFunction(method) {
    // If you need to check for a function, use a property or JS logic
    return typeof method !== 'function';
  }

  getVideoByName(identifier) {
    const video = videoRegistry.find((p) => p.identifier === identifier);
    if (!video) return undefined;
    return {
      ...video,
      instance: new video.target(),
    };
  }
}

module.exports = VideoManager;
