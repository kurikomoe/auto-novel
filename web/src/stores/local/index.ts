import { createGlobalState } from '@vueuse/core';

import { lazy } from '@/util';
import { createLocalVolumeStore as createLocalVolumeStore } from './LocalVolumeRepository';

export const useLocalVolumeStore = lazy(
  createGlobalState(createLocalVolumeStore),
);
