import { jwtDecode } from 'jwt-decode';

import { formatError } from '@/data/api';
import { setTokenGetter } from '@/data/api/client';
import { UserRole } from '@/model/User';
import { useLocalStorage } from '@/util';

import { LSKey } from '../LocalStorage';
import { AuthData, migrate } from './Auth';
import { AuthApi } from './AuthApi';

export const createAuthRepository = () => {
  const authData = useLocalStorage<AuthData>(LSKey.Auth, {
    profile: undefined,
    adminMode: false,
  });
  migrate(authData.value);

  // 清空过期 Access Token
  if (
    authData.value.profile &&
    Date.now() > authData.value.profile.expiredAt * 1000
  ) {
    authData.value.profile = undefined;
  }

  const whoami = computed(() => {
    const { profile, adminMode } = authData.value;

    const isAdmin = profile?.role === 'admin';
    const isSignedIn = profile !== undefined;

    const createAtLeast = (days: number) => {
      if (!profile) return false;
      return Date.now() / 1000 - profile.createdAt > days * 24 * 3600;
    };

    const buildRoleLabel = (auth: AuthData) => {
      if (!auth.profile) return '';

      const roleToString = {
        admin: '管理员',
        trusted: '信任用户',
        member: '普通用户',
        restricted: '受限用户',
        banned: '封禁用户',
      };
      return (
        (roleToString[auth.profile.role] ?? '未知用户') +
        (auth.adminMode ? '+' : '')
      );
    };

    return {
      user: {
        username: profile?.username ?? '未登录',
        role: buildRoleLabel(authData.value),
        createAt: profile?.createdAt ?? Date.now() / 1000,
      },
      isSignedIn,
      isAdmin,
      asAdmin: isAdmin && adminMode,
      allowNsfw: createAtLeast(30),
      allowAdvancedFeatures: createAtLeast(30),
      isMe: (username: string) => profile?.username === username,
    };
  });

  const toggleManageMode = () => {
    authData.value.adminMode = !authData.value.adminMode;
  };

  const refresh = () =>
    AuthApi.refresh().then((token) => {
      const { sub, exp, role, iat, crat } = jwtDecode<{
        sub: string;
        exp: number;
        iat: number;
        role: UserRole;
        crat: number;
      }>(token);
      authData.value.profile = {
        token,
        username: sub,
        role,
        issuedAt: iat,
        createdAt: crat,
        expiredAt: exp,
      };
    });

  const refreshIfNeeded = () => {
    // 刷新 Access Token，冷却时间为1小时
    const cooldown = 3600 * 1000;
    const sinceIssuedAt = Date.now() - (authData.value.profile?.issuedAt ?? 0);
    if (sinceIssuedAt < cooldown) {
      return;
    }
    return refresh().catch(async (e) => {
      console.warn('更新授权失败：' + (await formatError(e)));
    });
  };

  setTokenGetter(() => authData.value?.profile?.token ?? '');
  refreshIfNeeded();
  window.setInterval(refreshIfNeeded, 15 * 60 * 1000);

  const logout = () => {
    authData.value.profile = undefined;
    return AuthApi.logout();
  };

  return {
    whoami,
    toggleManageMode,
    refresh,
    logout,
  };
};
