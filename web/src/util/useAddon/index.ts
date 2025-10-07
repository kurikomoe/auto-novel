import ky_orig from 'ky';
import { AddonClient } from './addon';

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

export const addon = new AddonClient();

export const ky = ky_orig.create({ fetch: addon.http_fetch.bind(addon) });

export const ky_tab_factory = (url: string) => {
  const addon = new AddonClient();
  return ky_orig.create({
    fetch: (...args) => addon.tab_http_fetch.bind(addon)(url, ...args),
  });
};

export const ky_spoof_factory = (base_url: string) =>
  ky_orig.create({
    fetch: async (input, requestInit) => {
      const addon = await AddonClient.createWithJobId();
      console.log(await addon.info());
      let url;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        url = input.url;
      }
      const origin = new URL(base_url).origin;
      const id = await addon.bypass_enable(url, origin, origin + '/');

      const headers = new Headers(requestInit?.headers || {});
      // headers.set("credentials", "include");
      requestInit = {
        ...requestInit,
        headers,
      };
      const resp = await fetch(input, requestInit);

      await addon.bypass_disable(id, url);
      await addon.job_quit();
      return resp;
    },
  });
