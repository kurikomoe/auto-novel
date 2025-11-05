import ky from 'ky';

export const AuthUrl = window.location.hostname.includes('fishhawk.top')
  ? 'https://auth.fishhawk.top'
  : 'https://auth.novelia.cc';

const client = ky.create({
  prefixUrl: AuthUrl + '/api/v1',
  credentials: 'include',
});

export const AuthApi = {
  refresh: (app: string) =>
    client.post(`auth/refresh`, { searchParams: { app } }).text(),
  logout: () => client.post(`auth/logout`).text(),
};
