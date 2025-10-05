import ky_orig from 'ky';
import {
  type JobNewResult,
  serializeRequest,
  type ClientMethods,
  type SerializableResponse,
  Response2SerResp,
  InfoResult,
} from './client.types';
import type { Message, MSG_CRAWLER, MSG_RESPONSE } from './msg';
import { MSG_TYPE } from './msg';

class AddonCommunication {
  idx: number;
  addonID: string;

  job_id?: string;

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

  public set_job_id(job_id: string) {
    this.job_id = job_id;
  }
  public clear_job_id() {
    this.job_id = undefined;
  }

  buildCrawlerMessage<P>(
    cmd: string,
    params: P,
    base_url = '',
    single = true, // NOTE(kuriko): 调试时可以设置为 false 保留 tab 现场
  ): MSG_CRAWLER {
    if (this.job_id) {
      single = false;
    }
    const msg: MSG_CRAWLER = {
      type: MSG_TYPE.CRAWLER_REQ,
      id: (this.idx++).toString(),
      payload: {
        job_id: this.job_id ?? undefined,
        base_url,
        single,
        cmd,
        params,
      },
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

  public async cookies_get(url: string) {
    const cmd = 'cookies.get';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      { url },
      'local',
      false,
    );
    return await this.sendMessage(msg);
  }

  public async cookies_refresh(response: Response) {
    const serResp = await Response2SerResp(response);
    const cmd = 'local.cookies.setFromResponse';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      { response: serResp },
      'local',
      false,
    );
    return await this.sendMessage(msg);
  }

  public async bypass_toggle(
    enable: boolean,
    url: string,
    origin?: string,
    referer?: string,
  ) {
    const cmd = enable ? 'local.bypass.enable' : 'local.bypass.disable';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      { url, origin, referer },
      'local',
      false,
    );
    return await this.sendMessage(msg);
  }

  public async job_new(url: string): Promise<JobNewResult> {
    const cmd = 'job.new';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, undefined, url);
    return await this.sendMessage(msg);
  }

  public async job_quit() {
    const cmd = 'job.quit';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      undefined,
      undefined,
      true,
    );
    const ret = await this.sendMessage(msg);
    this.clear_job_id();
    return ret;
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

  public async ping(): Promise<string> {
    const cmd = 'base.ping';
    const msg = this.buildCrawlerMessage(cmd, undefined, 'local');
    return await this.sendMessage(msg);
  }

  public async info(): Promise<InfoResult> {
    const cmd = 'base.info';
    const msg = this.buildCrawlerMessage(cmd, undefined, 'local');
    return await this.sendMessage(msg);
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
  public comm: AddonCommunication;

  constructor() {
    this.comm = new AddonCommunication(AddonClient.addonID);
  }

  async ping(): Promise<string> {
    return await this.comm.ping();
  }

  async info(): Promise<InfoResult> {
    return await this.comm.info();
  }

  async bypass_enable(url: string, origin: string, referer: string) {
    await this.comm.bypass_toggle(true, url, origin, referer);
  }

  async bypass_disable(url: string) {
    await this.comm.bypass_toggle(false, url);
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

export const ky_tab_factory = (url: string) => {
  const addon = new AddonClient();
  return ky_orig.create({
    fetch: (...args) => addon.tab_fetch.bind(addon)(url, ...args),
  });
};

export const ky_spoof_factory = (base_url: string) =>
  ky_orig.create({
    fetch: async (input, requestInit) => {
      console.log(await addon.info());
      const { job_id } = await addon.comm.job_new('local');
      let url;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        url = input.url;
      }
      addon.comm.set_job_id(job_id);
      const origin = new URL(base_url).origin;
      await addon.bypass_enable(url, origin, origin + '/');

      // const cookies = await addon.comm.cookies_get(url) as chrome.cookies.Cookie[];
      // const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      // console.log(cookieStr);
      // const headers = new Headers(requestInit?.headers || {});
      // headers.set("Cookie", cookieStr);
      // requestInit = {
      //   ...requestInit,
      //   headers: Object.fromEntries(headers.entries()),
      // };
      // console.log(input, requestInit)

      const resp = await fetch(input, requestInit);
      // await addon.comm.cookies_refresh(resp);

      await addon.bypass_disable(url);
      await addon.comm.job_quit();
      return resp;
    },
  });
