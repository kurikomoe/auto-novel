import { useQuery } from '@pinia/colada';

import { ArticleApi } from '@/api';
import type { ArticleCategory } from '@/model/Article';
import { cache, withOnSuccess } from './cache';

const ItemKey = 'article';
const ListKey = 'article-list';

const useArticle = (id: string, enabled: boolean = true) =>
  useQuery({
    enabled,
    key: [ItemKey, id],
    query: () => ArticleApi.getArticle(id),
  });

const useArticleList = (
  page: MaybeRefOrGetter<number>,
  category: MaybeRefOrGetter<ArticleCategory>,
) =>
  useQuery({
    key: () => [ListKey, toValue(category), toValue(page)],
    query: () =>
      ArticleApi.listArticle({
        page: toValue(page) - 1,
        pageSize: 20,
        category: toValue(category),
      }),
  });

export const ArticleRepo = {
  useArticle,
  useArticleList,

  createArticle: withOnSuccess(ArticleApi.createArticle, (_, article) =>
    cache.invalidateQueries({ key: [ListKey, article.category] }),
  ),
  deleteArticle: withOnSuccess(ArticleApi.deleteArticle, () =>
    cache.invalidateQueries({ key: [ListKey] }),
  ),
  updateArticle: withOnSuccess(ArticleApi.updateArticle, (_, id) =>
    cache.invalidateQueries({ key: [ItemKey, id], exact: true }),
  ),
  pinArticle: ArticleApi.pinArticle,
  unpinArticle: ArticleApi.unpinArticle,
  lockArticle: ArticleApi.lockArticle,
  unlockArticle: ArticleApi.unlockArticle,
  hideArticle: ArticleApi.hideArticle,
  unhideArticle: ArticleApi.unhideArticle,
};
