import { createGlobalState } from '@vueuse/core';

import { lazy } from '@/util';
import { createLocalVolumeRepository } from './LocalVolumeRepository';

export const useLocalVolumeStore = lazy(
  createGlobalState(createLocalVolumeRepository),
);
