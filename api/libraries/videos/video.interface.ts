export type URL = string;

export abstract class VideoAbstract<T> {
  dto: new () => T;

  async processAndValidate(customParams?: T) {
    // Implement custom validation logic here if needed
    // For now, just a placeholder
    if (!customParams) throw new Error('Missing parameters');
  }

  abstract process(
    output: 'vertical' | 'horizontal',
    customParams?: T
  ): Promise<URL>;
}

export interface VideoParams {
  identifier: string;
  title: string;
  description: string;
  placement: 'text-to-image' | 'image-to-video' | 'video-to-video';
  available: boolean;
  trial: boolean;
}

// Removed ExposeVideoFunction and Video decorators
// If you need metadata, use plain JS or a library like reflect-metadata
