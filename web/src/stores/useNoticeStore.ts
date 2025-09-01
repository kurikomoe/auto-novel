import { useLocalStorage } from '@vueuse/core';
import { LSKey } from './key';

interface Noticed {
  wenkuUploadRule: number;
}

export const useNoticeStore = defineStore(LSKey.Notified, () => {
  const noticed = useLocalStorage<Noticed>(LSKey.Notified, {
    wenkuUploadRule: 0,
  });
  return {
    noticed,
  };
});
