import { useQuery, useQueryCache } from '@pinia/colada';

import { ArticleApi } from '@/data';

const ItemKey = 'article';

export const useArticle = (id: string, enabled: boolean = true) =>
  useQuery({
    enabled,
    key: [ItemKey, id],
    query: () => ArticleApi.getArticle(id),
  });

export const invalidateArticle = (id: string) =>
  useQueryCache().invalidateQueries({ key: [ItemKey, id], exact: true });
