const MediaRepository = require('./media.repository');
const OpenaiService = require('@gitroom/nestjs-libraries/openai/openai.service');
const SubscriptionService = require('@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service');
const VideoManager = require('@gitroom/nestjs-libraries/videos/video.manager');
const { UploadFactory } = require('@gitroom/nestjs-libraries/upload/upload.factory');
const {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} = require('@gitroom/backend/services/auth/permissions/permission.exception.class');

class MediaService {
  constructor(mediaRepository, openAi, subscriptionService, videoManager) {
    this._mediaRepository = mediaRepository;
    this._openAi = openAi;
    this._subscriptionService = subscriptionService;
    this._videoManager = videoManager;
    this.storage = UploadFactory.createStorage();
  }

  async deleteMedia(org, id) {
    return this._mediaRepository.deleteMedia(org, id);
  }

  getMediaById(id) {
    return this._mediaRepository.getMediaById(id);
  }

  async generateImage(prompt, org, generatePromptFirst) {
    return await this._subscriptionService.useCredit(org, 'ai_images', async () => {
      if (generatePromptFirst) {
        prompt = await this._openAi.generatePromptForPicture(prompt);
        console.log('Prompt:', prompt);
      }
      return this._openAi.generateImage(prompt, !!generatePromptFirst);
    });
  }

  saveFile(org, fileName, filePath) {
    return this._mediaRepository.saveFile(org, fileName, filePath);
  }

  getMedia(org, page) {
    return this._mediaRepository.getMedia(org, page);
  }

  saveMediaInformation(org, data) {
    return this._mediaRepository.saveMediaInformation(org, data);
  }

  getVideoOptions() {
    return this._videoManager.getAllVideos();
  }

  async generateVideoAllowed(org, type) {
    const video = this._videoManager.getVideoByName(type);
    if (!video) {
      throw new Error(`Video type ${type} not found`);
    }
    if (!video.trial && org.isTrailing) {
      throw new Error('This video is not available in trial mode');
    }
    return true;
  }

  async generateVideo(org, body) {
    const totalCredits = await this._subscriptionService.checkCredits(org, 'ai_videos');
    if (totalCredits.credits <= 0) {
      throw new Error('Not enough credits');
    }
    const video = this._videoManager.getVideoByName(body.type);
    if (!video) {
      throw new Error(`Video type ${body.type} not found`);
    }
    if (!video.trial && org.isTrailing) {
      throw new Error('This video is not available in trial mode');
    }
    await video.instance.processAndValidate(body.customParams);
    return await this._subscriptionService.useCredit(org, 'ai_videos', async () => {
      const loadedData = await video.instance.process(body.output, body.customParams);
      return loadedData;
    });
  }

  async videoFunction(identifier, functionName, body) {
    const video = this._videoManager.getVideoByName(identifier);
    if (!video) {
      throw new Error(`Video with identifier ${identifier} not found`);
    }
    const functionToCall = video.instance[functionName];
    if (typeof functionToCall !== 'function' || this._videoManager.checkAvailableVideoFunction(functionToCall)) {
      throw new Error(`Function ${functionName} not found on video instance`);
    }
    return functionToCall(body);
  }
}

module.exports = MediaService;
