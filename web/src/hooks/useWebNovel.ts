import { useQuery, useQueryCache } from '@pinia/colada';

import { WebNovelApi } from '@/data';

const ItemKey = 'web-novel';

export const useWebNovel = (
  providerId: string,
  novelId: string,
  enabled: boolean = true,
) =>
  useQuery({
    enabled,
    key: [ItemKey, providerId, novelId],
    query: () => WebNovelApi.getNovel(providerId, novelId),
  });

export const invalidateWebNovel = (providerId: string, novelId: string) =>
  useQueryCache().invalidateQueries({
    key: [ItemKey, providerId, novelId],
    exact: true,
  });
