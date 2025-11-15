import { Pixiv } from '@/domain/pixiv';
import type { WebNovelProvider } from '@/domain/types';
import ky from 'ky';

type ProviderInitFn = (_: typeof ky) => WebNovelProvider;
export const Providers: Record<string, ProviderInitFn> = {
  pixiv: (ky) => new Pixiv(ky),
};
