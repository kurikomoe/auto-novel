import { setTokenGetter } from '@/data/api/client';
import { useUserData } from '@/util';
import { LSKey } from './key';
import { UserRole } from '@/model/User';

export const useWhoamiStore = defineStore(LSKey.Auth, () => {
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
      return UserRole.toString(profile.role) + (adminMode ? '+' : '');
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
});
