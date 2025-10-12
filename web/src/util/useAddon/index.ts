type Cookie = browser.cookies.Cookie[];
export interface AddonApi {
  makeCookiesPublic(cookies: Cookie[]): Cookie[];

  cookiesGet(url: string): Promise<Cookie[]>;
  cookiesSet(cookies: Cookie[]): Promise<void>;

  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  tabFetch(
    options: { tabUrl: string; forceNewTab?: boolean },
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response>;
  spoofFetch(
    baseUrl: string,
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response>;
}
declare global {
  interface Window {
    Addon?: AddonApi;
  }
}

function buildApiEndpoint<K extends keyof AddonApi>(name: K) {
  const apiFunc = (
    ...args: Parameters<AddonApi[K]>
  ): ReturnType<AddonApi[K]> => {
    const addonImplementation = window.Addon?.[name];
    if (typeof addonImplementation === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      return (addonImplementation as Function)(...(args as unknown[]));
    }
    throw new Error('addon is not available');
  };
  return apiFunc;
}

// Delay the access to window.Addon until it's actually used
export const Addon: AddonApi = {
  makeCookiesPublic: buildApiEndpoint('makeCookiesPublic'),
  cookiesGet: buildApiEndpoint('cookiesGet'),
  cookiesSet: buildApiEndpoint('cookiesSet'),

  fetch: (...args: Parameters<AddonApi['fetch']>) => {
    if (window.Addon?.fetch) return window.Addon.fetch(...args);
    return fetch(...args);
  },

  tabFetch: buildApiEndpoint('tabFetch'),
  spoofFetch: buildApiEndpoint('spoofFetch'),
};
