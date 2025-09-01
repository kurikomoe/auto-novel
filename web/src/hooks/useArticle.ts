import { useQuery, useQueryCache } from '@pinia/colada';

import { ArticleApi } from '@/data';

const ArticleKey = 'article';

export const useArticle = (id: string, enabled: boolean = false) =>
  useQuery({
    enabled,
    key: [ArticleKey, id],
    query: () => ArticleApi.getArticle(id),
  });

export const invalidateArticle = (id: string) =>
  useQueryCache().invalidateQueries({ key: [ArticleKey, id], exact: true });
