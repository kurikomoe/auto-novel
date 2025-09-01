import { useQuery, useQueryCache } from '@pinia/colada';

import { WenkuNovelApi } from '@/data';

const ItemKey = 'web-novel';

export const useWenkuNovel = (novelId: string, enabled: boolean = true) =>
  useQuery({
    enabled,
    key: [ItemKey, novelId],
    query: () => WenkuNovelApi.getNovel(novelId),
  });

export const invalidateWenkuNovel = (novelId: string) =>
  useQueryCache().invalidateQueries({
    key: [ItemKey, novelId],
    exact: true,
  });
