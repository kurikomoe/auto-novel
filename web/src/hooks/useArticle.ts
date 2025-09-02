import { useQuery, useQueryCache } from '@pinia/colada';

import { ArticleApi } from '@/data';
import { ArticleCategory } from '@/model/Article';

const ItemKey = 'article';
const ListKey = 'article-list';

export const useArticle = (id: string, enabled: boolean = true) =>
  useQuery({
    enabled,
    key: [ItemKey, id],
    query: () => ArticleApi.getArticle(id),
  });

export const invalidateArticle = (id: string) =>
  useQueryCache().invalidateQueries({ key: [ItemKey, id], exact: true });

export const useArticleList = (
  page: MaybeRefOrGetter<number>,
  category: MaybeRefOrGetter<ArticleCategory>,
) =>
  useQuery({
    key: () => [ListKey, toValue(page), toValue(category)],
    query: () =>
      ArticleApi.listArticle({
        page: toValue(page) - 1,
        pageSize: 20,
        category: toValue(category),
      }),
  });
