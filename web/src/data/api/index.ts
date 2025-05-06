import { HTTPError, TimeoutError } from 'ky';

export { ArticleRepository } from './ArticleRepository';
export { CommentRepository } from './CommentRepository';
export { OperationRepository } from './OperationRepository';
export { UserRepository } from './UserRepository';
export { WebNovelRepository } from './WebNovelRepository';
export { WenkuNovelRepository } from './WenkuNovelRepository';

export const formatError = (error: unknown) => {
  if (error instanceof HTTPError) {
    let messageOverride: string | null = null;
    if (error.response.status === 429) {
      messageOverride = '操作额度耗尽，等明天再试吧';
    }
    return error.response
      .text()
      .then(
        (message) => `[${error.response.status}]${messageOverride ?? message}`,
      );
  } else if (error instanceof TimeoutError) {
    return '请求超时';
  } else {
    return `${error}`;
  }
};
