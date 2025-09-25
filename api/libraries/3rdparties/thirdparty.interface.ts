// The conversion removes NestJS-specific decorators and uses plain interfaces.

export abstract class ThirdPartyAbstract<T = any> {
  public abstract readonly params: ThirdPartyParams;

  abstract checkConnection(
    apiKey: string
  ): Promise<false | { name: string; username: string; id: string }>;
  abstract sendData(apiKey: string, data: T): Promise<string>;
  [key: string]: ((apiKey: string, data?: any) => Promise<any>) | undefined | any;
}

export interface ThirdPartyParams {
  identifier: string;
  title: string;
  description: string;
  position: 'media' | 'webhook';
  fields: {
    name: string;
    description: string;
    type: string;
    placeholder: string;
    validation?: RegExp;
  }[];
}