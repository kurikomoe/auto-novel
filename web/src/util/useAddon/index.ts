export interface CookieStatus {
  domain: string;
  name: string;
  hostOnly: boolean;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'no_restriction' | 'lax' | 'strict' | 'unspecified';
}

export interface AddonApi {
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
