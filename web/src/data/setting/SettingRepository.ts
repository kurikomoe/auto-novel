import { ReaderSetting, Setting } from '@/data/setting/Setting';
import { defaultConverter, useLocalStorage } from '@/util';

import { LSKey } from '../LocalStorage';

export const createSettingRepository = () => {
  const setting = useLocalStorage<Setting>(LSKey.Setting, Setting.defaultValue);
  Setting.migrate(setting.value);

  const cc = ref(defaultConverter);
  return { setting, cc };
};

export const createReaderSettingRepository = () => {
  const setting = useLocalStorage<ReaderSetting>(
    LSKey.SettingReader,
    ReaderSetting.defaultValue,
  );
  ReaderSetting.migrate(setting.value);
  return { setting };
};
