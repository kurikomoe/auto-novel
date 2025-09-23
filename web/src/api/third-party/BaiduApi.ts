import type { Options } from 'ky';
import ky from 'ky';

import { parseEventStream } from '@/util';

const sug = () => {
  const formData = new FormData();
  formData.append('kw', 'test');
  return ky
    .post('https://fanyi.baidu.com/sug', {
      body: formData,
      credentials: 'include',
      retry: 0,
    })
    .text();
};

const translate = (query: string, from: string, options: Options) => {
  return ky
    .post('https://fanyi.baidu.com/ait/text/translate', {
      headers: {
        accept: 'text/event-stream',
      },
      json: {
        from,
        to: 'zh',
        query,
        corpusIds: [],
        domain: 'common',
        milliTimestamp: Date.now(),
        needPhonetic: false,
        qcSettings: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
        reference: '',
      },
      credentials: 'include',
      retry: 0,
      ...options,
    })
    .text()
    .then(parseEventStream<TranslateChunk>);
};

export const BaiduApi = {
  sug,
  translate,
};

export type TranslateChunk = {
  errno: number;
  errmsg: string;
  data:
    | {
        event: 'Start' | 'StartTranslation' | 'TranslationSucceed' | 'Finished';
        message: string;
      }
    | {
        event: 'Translating';
        message: string;
        list: {
          id: string;
          paraIdx: number;
          src: string;
          dst: string;
          metadata: string;
        }[];
      };
};
