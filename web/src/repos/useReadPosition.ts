import { GenericNovelId } from '@/model/Common';
import { safeJson } from '@/util';

interface ReadPosition {
  chapterId: string;
  scrollY: number;
}

type ReaderPositions = Record<string, ReadPosition | undefined>;

const key = 'readPosition';

const storage = {
  get: () => {
    const text = window.localStorage.getItem(key) ?? '';
    const value = safeJson<ReaderPositions>(text) ?? {};
    return value;
  },
  set: (value: ReaderPositions) => {
    const text = JSON.stringify(value);
    window.localStorage.setItem(key, text);
  },
};

const addPosition = (gnid: GenericNovelId, position: ReadPosition) => {
  const positions = storage.get();
  if (position.scrollY === 0) {
    delete positions[GenericNovelId.toString(gnid)];
  } else {
    positions[GenericNovelId.toString(gnid)] = position;
  }
  storage.set(positions);
};

const getPosition = (gnid: GenericNovelId) => {
  const positions = storage.get();
  return positions[GenericNovelId.toString(gnid)];
};

export const ReadPositionRepo = {
  addPosition,
  getPosition,
};
