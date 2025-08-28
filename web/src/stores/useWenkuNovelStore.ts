import { WenkuNovelApi } from '@/data';
import { WenkuNovelDto } from '@/model/WenkuNovel';
import { Result, runCatching } from '@/util/result';

type WenkuNovelStore = {
  novelResult: Result<WenkuNovelDto> | undefined;
};

export const useWenkuNovelStore = (novelId: string) => {
  return defineStore(`wenku-novel/${novelId}`, {
    state: () =>
      <WenkuNovelStore>{
        novelResult: undefined,
      },
    actions: {
      async loadNovel(force = false) {
        if (!force && this.novelResult?.ok) {
          return this.novelResult;
        }

        this.novelResult = undefined;
        const result = await runCatching(WenkuNovelApi.getNovel(novelId));
        if (result.ok) {
          result.value.volumeZh = result.value.volumeZh.sort((a, b) =>
            a.localeCompare(b),
          );
          result.value.volumeJp = result.value.volumeJp.sort((a, b) =>
            a.volumeId.localeCompare(b.volumeId),
          );
        }
        this.novelResult = result;

        return this.novelResult;
      },

      async updateNovel(json: Parameters<typeof WenkuNovelApi.updateNovel>[1]) {
        await WenkuNovelApi.updateNovel(novelId, json);
        this.loadNovel(true);
      },

      async createVolume(
        volumeId: string,
        type: 'jp' | 'zh',
        file: File,
        onProgress: (p: number) => void,
      ) {
        const total = await WenkuNovelApi.createVolume(
          novelId,
          volumeId,
          type,
          file,
          onProgress,
        );

        if (this.novelResult?.ok) {
          if (type === 'jp') {
            this.novelResult.value.volumeJp.push({
              volumeId,
              total: Number(total),
              baidu: 0,
              youdao: 0,
              gpt: 0,
              sakura: 0,
            });
            this.novelResult.value.volumeJp =
              this.novelResult.value.volumeJp.sort((a, b) =>
                a.volumeId.localeCompare(b.volumeId),
              );
          } else {
            this.novelResult.value.volumeZh.push(volumeId);
            this.novelResult.value.volumeZh =
              this.novelResult.value.volumeZh.sort((a, b) =>
                a.localeCompare(b),
              );
          }
        }
      },

      async deleteVolume(volumeId: string) {
        await WenkuNovelApi.deleteVolume(novelId, volumeId);
        if (this.novelResult?.ok) {
          this.novelResult.value.volumeJp =
            this.novelResult.value.volumeJp.filter(
              (it) => it.volumeId !== volumeId,
            );
          this.novelResult.value.volumeZh =
            this.novelResult.value.volumeZh.filter((it) => it !== volumeId);
        }
      },
    },
  })();
};
