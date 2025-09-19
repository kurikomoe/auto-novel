import { lazy } from '@/util';
import { DBSchema, openDB } from 'idb';

interface TranslationCacheDBSchema extends DBSchema {
  'gpt-seg-cache': {
    key: string;
    value: { hash: string; text: string[] };
  };
  'sakura-seg-cache': {
    key: string;
    value: { hash: string; text: string[] };
  };
}

type TranslationCacheType = 'gpt-seg-cache' | 'sakura-seg-cache';

const createDb = lazy(() => {
  return openDB<TranslationCacheDBSchema>('test', 3, {
    upgrade(db, _oldVersion, _newVersion, _transaction, _event) {
      try {
        db.createObjectStore('gpt-seg-cache', { keyPath: 'hash' });
      } catch (e) {
        console.error(e);
      }
      try {
        db.createObjectStore('sakura-seg-cache', { keyPath: 'hash' });
      } catch (e) {
        console.error(e);
      }
    },
  });
});

export const TranslationCacheRepo = {
  clear: (type: TranslationCacheType) =>
    createDb().then((db) => db.clear(type)),
  get: (type: TranslationCacheType, hash: string) =>
    createDb().then((db) => db.get(type, hash).then((it) => it?.text)),
  create: (type: TranslationCacheType, hash: string, text: string[]) =>
    createDb().then((db) => db.put(type, { hash, text })),
};
