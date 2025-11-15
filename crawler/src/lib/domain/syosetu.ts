import { KyInstance } from 'ky';
import {
  WebNovelProvider,
  Page,
  RemoteChapter,
  RemoteNovelListItem,
  RemoteNovelMetadata,
} from './types';

export class Syosetu implements WebNovelProvider {
  readonly id = 'syosetu';
  readonly version = '1.0.0';

  client: KyInstance;

  constructor(client: KyInstance) {
    this.client = client;
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
