import { useQuery } from '@pinia/colada';

import { AuthAdminApi } from '@/api';
import type { UserRole } from '@/model/User';

const ListKey = 'admin-user-list';

const useUserList = (
  pageSize: number,
  page: MaybeRefOrGetter<number>,
  option: MaybeRefOrGetter<{
    username?: string;
    role?: UserRole;
  }>,
) =>
  useQuery({
    key: () => [ListKey, toValue(page), toValue(option)],
    query: () =>
      AuthAdminApi.listUser({
        page: toValue(page),
        pageSize,
        ...Object.fromEntries(
          Object.entries(toValue(option)).filter(
            ([_, value]) => value !== undefined && value !== null,
          ),
        ),
      }),
  });

export const AdminRepo = {
  useUserList,
};
