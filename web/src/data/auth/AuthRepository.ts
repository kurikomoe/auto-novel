import { setTokenGetter } from '@/data/api/client';
import { useUserData } from '@/util';

export const createAuthRepository = () => {
  const { userData, refresh, logout } = useUserData('n');
  setTokenGetter(() => userData.value?.profile?.token ?? '');

  const whoami = computed(() => {
    const { profile, adminMode } = userData.value;

    const isAdmin = profile?.role === 'admin';
    const isSignedIn = profile !== undefined;

    const createAtLeast = (days: number) => {
      if (!profile) return false;
      return Date.now() / 1000 - profile.createdAt > days * 24 * 3600;
    };

    const buildRoleLabel = () => {
      if (!profile) return '';

      const roleToString = {
        admin: '管理员',
        trusted: '信任用户',
        member: '普通用户',
        restricted: '受限用户',
        banned: '封禁用户',
      };
      const roleString = roleToString[profile.role] ?? '未知用户';
      return roleString + (adminMode ? '+' : '');
    };

    return {
      user: {
        username: profile?.username ?? '未登录',
        role: buildRoleLabel(),
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
    userData.value.adminMode = !userData.value.adminMode;
  };

  return {
    whoami,
    toggleManageMode,
    refresh,
    logout,
  };
};
