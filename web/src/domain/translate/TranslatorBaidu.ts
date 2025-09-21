import { BaiduApi } from '@/api';
import { RegexUtil } from '@/util';
import {
  Logger,
  SegmentContext,
  SegmentTranslator,
  createGlossaryWrapper,
  createLengthSegmentor,
} from './Common';

export class BaiduTranslator implements SegmentTranslator {
  id = <const>'baidu';
  log: (message: string) => void;
  constructor(log: Logger) {
    this.log = log;
  }

  async init() {
    await BaiduApi.sug();
    return this;
  }

  segmentor = createLengthSegmentor(3500);

  async translate(
    seg: string[],
    { glossary, signal }: SegmentContext,
  ): Promise<string[]> {
    return createGlossaryWrapper(glossary)(seg, (seg) =>
      this.translateInner(seg, signal),
    );
  }

  async translateInner(seg: string[], signal?: AbortSignal): Promise<string[]> {
    const query = seg.join('\n');

    let from = 'jp';
    if (RegexUtil.hasHangulChars(query)) {
      from = 'kor';
    } else if (RegexUtil.hasKanaChars(query) || RegexUtil.hasHanzi(query)) {
      from = 'jp';
    } else if (RegexUtil.hasEnglishChars(query)) {
      from = 'en';
    }
    const chunks = await BaiduApi.translate(query, from, { signal });

    const lineParts: { paraIdx: number; dst: string }[] = [];
    Array.from(chunks).forEach((chunk) => {
      if (chunk.data.event === 'Translating') {
        lineParts.push(...chunk.data.list);
      }
    });

    const lines: string[] = [];
    let currentParaIdx = 0;
    let currentLine = '';
    lineParts.forEach(({ paraIdx, dst }) => {
      if (paraIdx === currentParaIdx) {
        currentLine = currentLine + dst;
      } else {
        lines.push(currentLine);
        currentParaIdx = paraIdx;
        currentLine = dst;
      }
    });
    lines.push(currentLine);

    return lines;
  }
}

export namespace BaiduTranslator {
  export const create = (log: Logger) => new BaiduTranslator(log).init();
}
