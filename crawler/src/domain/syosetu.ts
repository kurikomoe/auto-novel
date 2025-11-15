import {
  WebNovelProvider,
  FetchType,
  Page,
  RemoteChapter,
  RemoteNovelListItem,
  RemoteNovelMetadata,
} from './types';

export class Syosetu implements WebNovelProvider {
  readonly id = 'syosetu';
  readonly version = '1.0.0';

  fetch: FetchType;

  constructor(fetch: FetchType) {
    this.fetch = fetch;
  }

  getRank(
    options: Record<string, string>,
  ): Promise<Page<RemoteNovelListItem> | null> {
    throw new Error('Method not implemented.');
  }
  getMetadata(novelId: string): Promise<RemoteNovelMetadata | null> {
    throw new Error('Method not implemented.');
  }
  getChapter(
    novelId: string,
    chapterId: string,
  ): Promise<RemoteChapter | null> {
    throw new Error('Method not implemented.');
  }
}
