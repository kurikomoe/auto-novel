import Bowser from 'bowser';

import type { Message, MessageRequest, MessageResponse } from './msg';
import { MessageRequestType, MessageResponseType } from './msg';
import type {
  ClientCmd,
  ClientMethods,
  InfoResult,
  JobNewResult,
  SerializableResponse,
} from './types';
import { serializeRequest, serializeResponse } from './types';

async function sendMessageChrome<T>(msg: Message): Promise<T> {
  const addonId = 'kenigjdcpndlkomhegjcepokcgikpdki';
  return new Promise(async (resolve, reject) => {
    chrome.runtime.sendMessage(addonId, msg, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error sending message to addon:',
          chrome.runtime.lastError,
        );
        reject(chrome.runtime.lastError);
      }
      console.log(response);
      resolve(response.payload.result);
    });
  });
}

async function sendMessageFirefox<T>(msg: Message): Promise<T> {
  // const addonId = 'addon@n.novelia.cc';
  return new Promise<T>((resolve, reject) => {
    const listener = (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }

      if (event.data?.type !== MessageResponseType) return;

      const resp: MessageResponse = event.data;
      if (resp.id != msg.id) return;

      window.removeEventListener('message', listener);
      if (resp.payload.success) {
        return resolve(resp.payload.result);
      } else {
        console.error('Error from addon:', resp.payload);
        return reject(resp.payload.error);
      }
    };
    window.postMessage(msg, '*');
    window.addEventListener('message', listener);
  });
}

function createAddonApi() {
  const bowser = Bowser.getParser(window.navigator.userAgent);
  const browser = bowser.getBrowserName(true);

  if (browser === 'chrome' || browser === 'edge') {
    return { sendMessage: sendMessageChrome };
  } else if (browser === 'firefox') {
    return { sendMessage: sendMessageFirefox };
  } else {
    async function sendMessageFallback<T>(msg: Message): Promise<T> {
      throw new Error(`浏览器${browser}不支持插件通信`);
    }
    return { sendMessage: sendMessageFallback };
  }
}

let msgId = 1;

const api = createAddonApi();

export class AddonClient {
  jobId: string | undefined;

  static async createWithJobId() {
    const addon = new AddonClient();
    const { job_id } = await addon.job_new('local');
    addon.jobId = job_id;
    return addon;
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
    cmd: ClientCmd,
    params: P,
    base_url = '',
    single = true, // NOTE(kuriko): 调试时可以设置为 false 保留 tab 现场
  ): MessageRequest {
    if (this.jobId) {
      single = false;
    }
    const msg: MessageRequest = {
      type: MessageRequestType,
      id: (msgId++).toString(),
      payload: {
        job_id: this.jobId,
        base_url,
        single,
        cmd,
        params,
      },
    };
    return msg;
  }

  async cookies_getStr(url: string): Promise<string> {
    const cmd = 'cookies.getStr';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      { url },
      'local',
      false,
    );
    return await api.sendMessage(msg);
  }

  async cookies_refresh(response: Response) {
    const serResp = await serializeResponse(response);
    const cmd = 'local.cookies.setFromResponse';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      { response: serResp },
      'local',
      false,
    );
    return await api.sendMessage(msg);
  }

  async bypass_toggle(
    enable: boolean,
    params: {
      id?: string;
      url: string;
      origin?: string;
      referer?: string;
    },
  ): Promise<string | null> {
    const { id, url, origin, referer } = params;
    const cmd = enable ? 'local.bypass.enable' : 'local.bypass.disable';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      { id, url, origin, referer },
      'local',
      false,
    );
    return await api.sendMessage(msg);
  }

  async job_new(url: string): Promise<JobNewResult> {
    const cmd = 'job.new';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, undefined, url);
    return await api.sendMessage(msg);
  }

  async job_quit() {
    const cmd = 'job.quit';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(
      cmd,
      undefined,
      undefined,
      true,
    );
    const ret = await api.sendMessage(msg);
    this.jobId = undefined;
    return ret;
  }

  async dom_querySelectorAll(selector: string, url: string): Promise<string> {
    const cmd = 'dom.querySelectorAll';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, { selector }, url);
    return await api.sendMessage(msg);
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

  async http_fetch(
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
    const resp: SerializableResponse = await api.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  async tab_http_fetch(
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
    const resp: SerializableResponse = await api.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  async http_get(
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
    const resp: SerializableResponse = await api.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  async http_post(url: string, data = {}, headers = []): Promise<Response> {
    const cmd = 'http.postJson';
    type ParamType = Parameters<ClientMethods[typeof cmd]>[0];
    const params: ParamType = { url, data, headers };
    const msg = this.buildCrawlerMessage(cmd, params, url);
    const resp: SerializableResponse = await api.sendMessage(msg);
    return this.wrapResponse(resp);
  }

  async ping(): Promise<string> {
    const cmd = 'base.ping';
    const msg = this.buildCrawlerMessage(cmd, undefined, 'local');
    return await api.sendMessage(msg);
  }

  async info(): Promise<InfoResult> {
    const cmd = 'base.info';
    const msg = this.buildCrawlerMessage(cmd, undefined, 'local');
    return await api.sendMessage(msg);
  }

  async bypass_enable(
    url: string,
    origin: string,
    referer: string,
  ): Promise<string> {
    const id = await this.bypass_toggle(true, { url, origin, referer });
    if (!id) {
      console.error('Bypass enabled without id');
    }
    return id ?? '';
  }

  async bypass_disable(id: string, url: string) {
    await this.bypass_toggle(false, { id, url });
  }
}
