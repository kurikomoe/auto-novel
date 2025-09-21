import { createGlobalState } from '@vueuse/core';
import { createLocalVolumeRepository } from './local';
import {
  createGptWorkspaceRepository,
  createSakuraWorkspaceRepository,
} from './stores';
import {
  createAmazonRepository,
  createBaiduRepository,
  createOpenAiRepository,
  createOpenAiWebRepository,
  createYoudaoRepository,
} from './third-party';
export * from './api';
export { OpenAiError } from './third-party/OpenAiRepository';

const lazy = <T>(factory: () => T) => {
  let value: T;
  const get = () => {
    if (value === undefined) {
      value = createGlobalState(factory)();
    }
    return value;
  };
  return get;
};

const lazyAsync = <T>(factory: () => Promise<T>) => {
  let value: Promise<T>;
  const get = async () => {
    if (value === undefined) {
      value = createGlobalState(factory)();
    }
    return await value;
  };
  return get;
};

export const Locator = {
  localVolumeRepository: lazyAsync(createLocalVolumeRepository),
  //
  gptWorkspaceRepository: lazy(createGptWorkspaceRepository),
  sakuraWorkspaceRepository: lazy(createSakuraWorkspaceRepository),
  //
  amazonRepository: lazy(createAmazonRepository),
  baiduRepository: lazy(createBaiduRepository),
  youdaoRepository: lazy(createYoudaoRepository),
  openAiRepositoryFactory: createOpenAiRepository,
  openAiWebRepositoryFactory: createOpenAiWebRepository,
};
