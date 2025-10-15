type Cookie = browser.cookies.Cookie[];
type CookieStatus = Partial<Omit<browser.cookies.Cookie, 'value'>> & {
  name: string;
};

export interface AddonApi {
  makeCookiesPublic<T extends Cookie | CookieStatus>(cookies: T[]): T[];

  cookiesStatus(params: {
    url?: string;
    domain?: string;
    keys: string[] | '*';
  }): Promise<Record<string, CookieStatus>>;

  cookiesPatch(params: {
    url: string;
    patches: Record<string, CookieStatus>;
  }): Promise<void>;

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
  // Can not bypass type check here, manually implement it.
  makeCookiesPublic<T extends Cookie | CookieStatus>(cookies: T[]): T[] {
    if (window.Addon?.makeCookiesPublic)
      return window.Addon.makeCookiesPublic(cookies);
    throw new Error('addon is not available');
  },

  cookiesStatus: buildApiEndpoint('cookiesStatus'),
  cookiesPatch: buildApiEndpoint('cookiesPatch'),

  fetch: (...args: Parameters<AddonApi['fetch']>) => {
    if (window.Addon?.fetch) return window.Addon.fetch(...args);
    return fetch(...args);
  },

  tabFetch: buildApiEndpoint('tabFetch'),
  spoofFetch: buildApiEndpoint('spoofFetch'),
};
