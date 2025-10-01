import { ClientMethods, SerializableResponse } from './client.types';
import { Message, MSG_CRAWLER, MSG_RESPONSE, MSG_TYPE } from './msg';

class AddonCommunication {
  idx: number;
  addonID: string;

  constructor(addonID: string) {
    this.addonID = addonID;
    this.idx = 1;
  }

  wrapResponse(response: SerializableResponse): any {
    return {
      text: async () => response.body,
      json: async () => JSON.parse(response.body),
      ...response,
    };
  }

  public async sendMessage<T>(msg: Message): Promise<T> {
    console.log(msg);
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        this.addonID,
        msg,
        (response: MSG_RESPONSE) => {
          if (chrome.runtime.lastError) {
            console.error(
              'Error sending message to addon:',
              chrome.runtime.lastError,
            );
            reject(chrome.runtime.lastError);
          }
          console.log(response);
          resolve(response.payload.result);
        },
      );
    });
  }

  public async http_get(
    url: string,
    searchParams = {},
    headers = {},
  ): Promise<Response> {
    type ParamType = Parameters<ClientMethods['http.get']>[0];
    const params: ParamType = {
      url,
      params: searchParams,
      headers,
    };

    const msg: MSG_CRAWLER = {
      type: MSG_TYPE.CRAWLER_REQ,
      payload: {
        base_url: url,
        single: true,
        cmd: 'http.get',
        params,
      },
    };
    const resp: SerializableResponse = await this.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  public async http_post(
    url: string,
    data = {},
    headers = {},
  ): Promise<Response> {
    type ParamType = Parameters<ClientMethods['http.postJson']>[0];
    const params: ParamType = {
      url,
      data,
      headers,
    };

    const msg: MSG_CRAWLER = {
      type: MSG_TYPE.CRAWLER_REQ,
      payload: {
        base_url: url,
        single: true,
        cmd: 'http.post',
        params,
      },
    };
    const resp: SerializableResponse = await this.sendMessage(msg);
    return this.wrapResponse(resp);
  }
}

export interface Options {
  prefixUrl: string;
  headers: {
    Accept: string;
    Authorization: string;
    'Content-Type': string;
  };
  timeout: number;
  retry: number;
}

export class AddonClient {
  static addonID = 'heaclbjdecgjhkbeigpkgoboipadjalj';
  private comm: AddonCommunication;

  constructor() {
    this.comm = new AddonCommunication(AddonClient.addonID);
  }

  public async get(url: string, options?: Options): Promise<Response> {
    console.log('get', url, options);
    const final_url = new URL(url, options?.prefixUrl ?? '/');
    const searchParams = options?.searchParams || {};
    return await this.comm.http_get(final_url.toString(), searchParams);
  }

  public async postJson(url: string, options?: Options): Promise<Response> {
    console.log('post', url, options);
    const final_url = new URL(url, options?.prefixUrl ?? '/');
    const json = options?.json || {};
    return await this.comm.http_get(final_url.toString(), json, {
      ...options?.headers,
    });
  }
}

export const addon = new AddonClient();
