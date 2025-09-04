import { useQuery, useQueryCache } from '@pinia/colada';

import { FavoredApi, WenkuNovelApi } from '@/data';

const ItemKey = 'wenku-novel';
const ListKey = 'wenku-novel-list';
const ListFavoredKey = 'wenku-novel-list-favored';

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

export const useWenkuNovelList = (
  page: MaybeRefOrGetter<number>,
  option: MaybeRefOrGetter<{
    query?: string;
    level?: number;
  }>,
) =>
  useQuery({
    key: () => [ListKey, toValue(option), toValue(page)],
    query: () =>
      WenkuNovelApi.listNovel({
        page: toValue(page) - 1,
        pageSize: 24,
        ...toValue(option),
      }),
  });

export const useWenkuNovelFavoredList = (
  page: MaybeRefOrGetter<number>,
  favoredId: MaybeRefOrGetter<string>,
  option: MaybeRefOrGetter<{
    sort: 'create' | 'update';
  }>,
) =>
  useQuery({
    key: () => [ListFavoredKey, toValue(option), toValue(page)],
    query: () =>
      FavoredApi.listFavoredWenkuNovel(toValue(favoredId), {
        page: toValue(page) - 1,
        pageSize: 24,
        ...toValue(option),
      }),
  });
