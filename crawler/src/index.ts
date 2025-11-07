import { Pixiv } from '@/domain/pixiv';
import type { FetchType, WebNovelProvider } from '@/domain/types';

export const Providers: Record<string, (fetch: FetchType) => WebNovelProvider> =
  {
    pixiv: (fetch) => new Pixiv(fetch),
  };
