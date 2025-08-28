import { WenkuNovelApi } from '@/data';
import { WenkuNovelDto } from '@/model/WenkuNovel';
import { Result, runCatching } from '@/util/result';

export const useWenkuNovelStore = (novelId: string) => {
  return defineStore(`wenku-novel/${novelId}`, () => {
    const novelResult = ref<Result<WenkuNovelDto>>();

    async function loadNovel(force = false) {
      if (!force && novelResult.value?.ok) {
        return novelResult.value;
      }

      novelResult.value = undefined;
      const result = await runCatching(WenkuNovelApi.getNovel(novelId));
      if (result.ok) {
        result.value.volumeZh = result.value.volumeZh.sort((a, b) =>
          a.localeCompare(b),
        );
        result.value.volumeJp = result.value.volumeJp.sort((a, b) =>
          a.volumeId.localeCompare(b.volumeId),
        );
      }
      novelResult.value = result;

      return result;
    }

    async function updateNovel(
      json: Parameters<typeof WenkuNovelApi.updateNovel>[1],
    ) {
      await WenkuNovelApi.updateNovel(novelId, json);
      loadNovel(true);
    }

    async function createVolume(
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

      if (novelResult.value?.ok) {
        if (type === 'jp') {
          novelResult.value.value.volumeJp.push({
            volumeId,
            total: Number(total),
            baidu: 0,
            youdao: 0,
            gpt: 0,
            sakura: 0,
          });
          novelResult.value.value.volumeJp =
            novelResult.value.value.volumeJp.sort((a, b) =>
              a.volumeId.localeCompare(b.volumeId),
            );
        } else {
          novelResult.value.value.volumeZh.push(volumeId);
          novelResult.value.value.volumeZh =
            novelResult.value.value.volumeZh.sort((a, b) => a.localeCompare(b));
        }
      }
    }

    async function deleteVolume(volumeId: string) {
      await WenkuNovelApi.deleteVolume(novelId, volumeId);
      if (novelResult.value?.ok) {
        novelResult.value.value.volumeJp =
          novelResult.value.value.volumeJp.filter(
            (it) => it.volumeId !== volumeId,
          );
        novelResult.value.value.volumeZh =
          novelResult.value.value.volumeZh.filter((it) => it !== volumeId);
      }
    }

    return {
      novelResult,
      loadNovel,
      updateNovel,
      createVolume,
      deleteVolume,
    };
  })();
};
