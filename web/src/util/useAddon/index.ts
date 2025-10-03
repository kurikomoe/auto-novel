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
    return new Promise((resolve, reject) => {
      console.log(msg);
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

  public async job_new(url: string) {
    const cmd = 'job.new';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, { url }, url);
    return await this.sendMessage(msg);
  }

  public async job_quit() {
    const cmd = 'job.quit';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, undefined, undefined);
    return await this.sendMessage(msg);
  }

  public async dom_querySelectorAll(
    selector: string,
    url: string,
  ): Promise<string> {
    const cmd = 'dom.querySelectorAll';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, { selector }, url);
    return await this.sendMessage(msg);
  }

  private rebuild_serializable_request(
    input: RequestInfo | URL,
  ): [string, Request | string] {
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
    return [url, input];
  }

  public async http_fetch(
    input: RequestInfo | URL,
    requestInit?: RequestInit,
  ): Promise<Response> {
    const [url, _input] = this.rebuild_serializable_request(input);
    const cmd = 'http.fetch';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const serInput =
      typeof _input === 'string' ? _input : await serializeRequest(_input);
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      { input: serInput, requestInit },
      url,
    );
    const resp: SerializableResponse = await this.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  public async tab_http_fetch(
    base_url: string,
    input: RequestInfo | URL,
    requestInit?: RequestInit,
  ): Promise<Response> {
    const [url, _input] = this.rebuild_serializable_request(input);
    const cmd = 'tab.http.fetch';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const serInput =
      typeof _input === 'string' ? _input : await serializeRequest(_input);
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      { input: serInput, requestInit },
      base_url,
    );
    const resp: SerializableResponse = await this.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  public async http_get(
    url: string,
    searchParams = {},
    headers = [],
  ): Promise<Response> {
    const cmd = 'http.get';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const params: ParamType = {
      url,
      params: searchParams,
      headers,
    };

    const msg = this.buildCrawlerMessage(cmd, params, url);
    const resp: SerializableResponse = await this.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  public async http_post(
    url: string,
    data = {},
    headers = [],
  ): Promise<Response> {
    const cmd = 'http.postJson';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const params: ParamType = { url, data, headers };
    const msg = this.buildCrawlerMessage(cmd, params, url);
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
  // This is generated from manifest.json/key (aka public key)
  // Please get the `private.pem` file from the AutoNovel group members
  static addonID = 'kenigjdcpndlkomhegjcepokcgikpdki';
  private comm: AddonCommunication;

  constructor() {
    this.comm = new AddonCommunication(AddonClient.addonID);
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return await this.comm.http_fetch(input, init);
  }

  async tab_fetch(
    base_url: string,
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    return await this.comm.tab_http_fetch(base_url, input, init);
  }

  async dom_querySelectorAll(selector: string, base_url: string) {}
}

export const addon = new AddonClient();
export const ky = ky_orig.create({ fetch: addon.fetch.bind(addon) });
export const ky_factory = (url: string) => {
  const addon = new AddonClient();
  return ky_orig.create({
    fetch: (a, b) => addon.tab_fetch.bind(addon)(url, a, b),
  });
};
