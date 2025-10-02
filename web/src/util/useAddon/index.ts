import ky_orig from 'ky';
import {
  serializeRequest,
  type ClientMethods,
  type SerializableResponse,
} from './client.types';
import type { Message, MSG_CRAWLER, MSG_RESPONSE } from './msg';
import { MSG_TYPE } from './msg';

class AddonCommunication {
  idx: number;
  addonID: string;

  constructor(addonID: string) {
    this.addonID = addonID;
    this.idx = 1;
  }

  wrapResponse(resp: SerializableResponse): Response {
    const init: ResponseInit = {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers,
    };
    const realResp = new Response(resp.body, init);
    return realResp;
  }

  buildCrawlerMessage<P>(
    cmd: string,
    params: P,
    base_url = '',
    single = true,
  ): MSG_CRAWLER {
    const msg: MSG_CRAWLER = {
      type: MSG_TYPE.CRAWLER_REQ,
      id: (this.idx++).toString(),
      payload: { base_url, single, cmd, params },
    };
    return msg;
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

  public async http_raw_fetch(
    input: RequestInfo | URL,
    requestInit?: RequestInit,
  ): Promise<Response> {
    let url: string;
    if (input instanceof URL) {
      input = input.toString();
      url = input;
    }
    input = input as Request | string;
    if (typeof input === 'string') {
      url = input;
    } else {
      url = input.url;
    }
    type ParamType = Parameters<ClientMethods['http.raw']>[0];
    const serInput = await serializeRequest(input);
    const msg = this.buildCrawlerMessage<ParamType>(
      'http.raw',
      { input: serInput, requestInit },
      url,
    );
    const resp: SerializableResponse = await this.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  public async http_get(
    url: string,
    searchParams = {},
    headers = [],
  ): Promise<Response> {
    type ParamType = Parameters<ClientMethods['http.get']>[0];
    const params: ParamType = {
      url,
      params: searchParams,
      headers,
    };

    const msg = this.buildCrawlerMessage('http.get', params, url);
    const resp: SerializableResponse = await this.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  public async http_post(
    url: string,
    data = {},
    headers = [],
  ): Promise<Response> {
    type ParamType = Parameters<ClientMethods['http.postJson']>[0];
    const params: ParamType = {
      url,
      data,
      headers,
    };
    const msg = this.buildCrawlerMessage('http.postJson', params, url);
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
  static addonID = 'nanejbmiefglbjfibnabpedojhhajdck';
  private comm: AddonCommunication;

  constructor() {
    this.comm = new AddonCommunication(AddonClient.addonID);
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return await this.comm.http_raw_fetch(input, init);
  }
}

export const addon = new AddonClient();
export const ky = ky_orig.create({ fetch: addon.fetch.bind(addon) });
