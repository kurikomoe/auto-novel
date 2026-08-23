<script lang="ts" setup>
import { DeleteOutlineOutlined } from '@vicons/material';

import { WebNovelApi, WenkuNovelApi } from '@/api';
import { GenericNovelId } from '@/model/Common';
import { Glossary } from '@/model/Glossary';
import type { WebNovelAiGlossaryDto } from '@/model/WebNovel';
import { copyToClipBoard, doAction } from '@/pages/util';
import { useLocalVolumeStore, useWhoamiStore } from '@/stores';
import { downloadFile } from '@/util';

const props = defineProps<{
  gnid?: GenericNovelId;
  value: Glossary;
}>();

const message = useMessage();

const whoamiStore = useWhoamiStore();
const { whoami } = storeToRefs(whoamiStore);

const glossary = ref<Glossary>({});
const aiGlossaryResponse = ref<WebNovelAiGlossaryDto>();
const aiLoadState = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle');
const aiLoadError = ref('');
const activeTerm = ref<string>();
const rowElements = new Map<string, HTMLElement>();

const isWebNovel = computed(() => props.gnid?.type === 'web');
const aiGlossary = computed<Glossary>(
  () => aiGlossaryResponse.value?.glossary ?? {},
);
const mergedGlossary = computed<Glossary>(() => {
  return Glossary.merge(aiGlossary.value, glossary.value);
});
const comparisonTerms = computed(() =>
  Glossary.comparisonTerms(aiGlossary.value, glossary.value),
);
const displayGlossarySize = computed(() =>
  isWebNovel.value && aiLoadState.value === 'loaded'
    ? comparisonTerms.value.length
    : Object.keys(props.value).length,
);
const aiGeneratedAt = computed(() => {
  const timestamp = aiGlossaryResponse.value?.generatedAt;
  return timestamp === undefined
    ? undefined
    : new Date(timestamp * 1000).toLocaleString();
});

const hasOwn = (value: Glossary, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const loadAiGlossary = async () => {
  const gnid = props.gnid;
  if (gnid?.type !== 'web') return;
  aiLoadState.value = 'loading';
  aiLoadError.value = '';
  try {
    aiGlossaryResponse.value = await WebNovelApi.getAiGlossary(
      gnid.providerId,
      gnid.novelId,
    );
    aiLoadState.value = 'loaded';
  } catch (error) {
    aiGlossaryResponse.value = undefined;
    aiLoadState.value = 'error';
    aiLoadError.value = error instanceof Error ? error.message : String(error);
  }
};

const setRowElement = (term: string, element: unknown) => {
  if (element instanceof HTMLElement) {
    rowElements.set(term, element);
  } else {
    rowElements.delete(term);
  }
};

const locateTerm = async (term: string) => {
  activeTerm.value = term;
  await nextTick();
  rowElements.get(term)?.scrollIntoView({ block: 'nearest' });
};

const showGlossaryModal = ref(false);

const toggleGlossaryModal = () => {
  if (showGlossaryModal.value === false) {
    glossary.value = { ...props.value };
    activeTerm.value = undefined;
    if (isWebNovel.value) void loadAiGlossary();
  }
  showGlossaryModal.value = !showGlossaryModal.value;
};

const gnidHint = computed(() => {
  const gnid = props.gnid;
  if (gnid === undefined) {
    return undefined;
  } else {
    return GenericNovelId.toString(gnid);
  }
});

const updateGlossary = async () => {
  const gnid = props.gnid;
  if (gnid === undefined) {
    return;
  }
  const glossaryValue = toRaw(glossary.value);
  if (gnid.type === 'web') {
    await WebNovelApi.updateGlossary(
      gnid.providerId,
      gnid.novelId,
      glossaryValue,
    );
  } else if (gnid.type === 'wenku') {
    await WenkuNovelApi.updateGlossary(gnid.novelId, glossaryValue);
  } else {
    const repo = await useLocalVolumeStore();
    await repo.updateGlossary(gnid.volumeId, glossaryValue);
  }
};

const submitGlossary = () =>
  doAction(
    updateGlossary().then(() => {
      // 触发组件外的术语表本体更新。有点傻，但够用。
      for (const key in props.value) {
        delete props.value[key];
      }
      for (const key in glossary.value) {
        props.value[key] = glossary.value[key];
      }
    }),
    '术语表提交',
    message,
  );

const importGlossaryRaw = ref('');
const termsToAdd = ref<[string, string]>(['', '']);

const deletedTerms = ref<[string, string][]>([]);

const lastDeletedTerm = computed(() => {
  const last = deletedTerms.value[deletedTerms.value.length - 1];
  if (last === undefined) return undefined;
  return `${last[0]} => ${last[1]}`;
});

const clearTerm = () => {
  glossary.value = {};
};

const undoDeleteTerm = () => {
  if (deletedTerms.value.length === 0) return;
  const [jp, zh] = deletedTerms.value.pop()!;
  glossary.value[jp] = zh;
};

const deleteTerm = (jp: string) => {
  if (jp in glossary.value) {
    deletedTerms.value.push([jp, glossary.value[jp]]);
    delete glossary.value[jp];
  }
};

const addTerm = () => {
  const [jp, zh] = termsToAdd.value;
  if (jp && zh) {
    const source = jp.trim();
    glossary.value[source] = zh.trim();
    termsToAdd.value = ['', ''];
    void locateTerm(source);
  }
};

const exportGlossary = async (ev: MouseEvent) => {
  const isSuccess = await copyToClipBoard(
    Glossary.toText(glossary.value),
    ev.target as HTMLElement,
  );
  if (isSuccess) {
    message.success('导出成功：已复制到剪贴板');
  } else {
    message.success('导出失败');
  }
};

const importGlossary = () => {
  const importedGlossary = Glossary.fromText(importGlossaryRaw.value);
  if (importedGlossary === undefined) {
    message.error('导入失败：术语表格式不正确');
  } else {
    message.success('导入成功');
    for (const jp in importedGlossary) {
      const zh = importedGlossary[jp];
      glossary.value[jp] = zh;
    }
  }
};

const downloadGlossaryAsJsonFile = async (ev: MouseEvent) => {
  downloadFile(
    `${gnidHint.value ?? 'glossary'}.json`,
    new Blob([Glossary.toJson(glossary.value)], {
      type: 'text/plain',
    }),
  );
};
</script>

<template>
  <c-button
    :label="`术语表[${displayGlossarySize}]`"
    v-bind="$attrs"
    @action="toggleGlossaryModal()"
  />

  <c-modal
    title="编辑术语表"
    v-model:show="showGlossaryModal"
    :extra-height="120"
    :width="isWebNovel ? 1100 : 600"
  >
    <template #header-extra>
      <n-flex
        vertical
        size="large"
        style="max-width: 400px; margin-bottom: 16px"
      >
        <template v-if="gnidHint">
          <n-text style="font-size: 12px">{{ gnidHint }}</n-text>

          <n-text>
            使用前务必先阅读
            <c-a to="/forum/660ab4da55001f583649a621">术语表使用指南</c-a>
            ，不要滥用术语表。
          </n-text>
        </template>

        <n-input-group>
          <n-input
            pair
            v-model:value="termsToAdd"
            size="small"
            separator="=>"
            :placeholder="['日文', '中文']"
            :input-props="{ spellcheck: false }"
          />
          <c-button
            label="添加"
            :round="false"
            size="small"
            @action="addTerm"
          />
        </n-input-group>

        <n-input
          v-model:value="importGlossaryRaw"
          type="textarea"
          size="small"
          placeholder="批量导入术语表"
          :input-props="{ spellcheck: false }"
          :rows="1"
        />

        <n-flex align="center" :wrap="false">
          <c-button
            label="导出"
            :round="false"
            size="small"
            @action="exportGlossary"
          />
          <c-button
            label="导入"
            :round="false"
            size="small"
            @action="importGlossary"
          />
          <c-button
            label="下载json文件"
            :round="false"
            size="small"
            @action="downloadGlossaryAsJsonFile"
          />
          <c-button
            v-if="whoami.isAdmin"
            secondary
            type="error"
            label="清空"
            :round="false"
            size="small"
            @action="clearTerm"
          />
        </n-flex>
        <n-flex align="center" :wrap="false">
          <c-button
            :disabled="deletedTerms.length === 0"
            label="撤销删除"
            :round="false"
            size="small"
            @action="undoDeleteTerm"
          />
          <n-text
            v-if="lastDeletedTerm !== undefined"
            depth="3"
            style="font-size: 12px"
          >
            {{ lastDeletedTerm }}
          </n-text>
        </n-flex>
      </n-flex>
    </template>

    <template v-if="isWebNovel">
      <n-alert
        v-if="aiLoadState === 'loading'"
        type="info"
        title="正在加载 AI 术语表"
        style="margin-bottom: 12px"
      />
      <n-alert
        v-else-if="aiLoadState === 'error'"
        type="error"
        title="AI 术语表加载失败"
        style="margin-bottom: 12px"
      >
        <n-flex align="center" justify="space-between">
          <span>{{ aiLoadError }}</span>
          <c-button label="重试" size="small" @action="loadAiGlossary" />
        </n-flex>
      </n-alert>
      <n-alert
        v-else-if="aiGlossaryResponse?.stale"
        type="warning"
        title="AI 术语表已过期"
        style="margin-bottom: 12px"
      >
        小说在 AI 术语表生成后已有更新；旧 AI 条目仍会作为翻译兜底使用。
        <template v-if="aiGeneratedAt">生成时间：{{ aiGeneratedAt }}</template>
      </n-alert>
      <n-text
        v-else-if="aiLoadState === 'loaded' && aiGeneratedAt"
        depth="3"
        style="display: block; margin-bottom: 8px; font-size: 12px"
      >
        AI 术语表生成时间：{{ aiGeneratedAt }}
      </n-text>

      <div v-if="comparisonTerms.length !== 0" class="glossary-comparison">
        <n-table striped size="small" style="font-size: 12px; min-width: 960px">
          <thead>
            <tr>
              <th colspan="2" class="source-header ai-header">AI（只读）</th>
              <th colspan="3" class="source-header human-header">人工</th>
              <th colspan="2" class="source-header final-header">
                最终结果（只读）
              </th>
            </tr>
            <tr>
              <th>日文</th>
              <th>中文</th>
              <th></th>
              <th>日文</th>
              <th>中文</th>
              <th>日文</th>
              <th>中文</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="wordJp in comparisonTerms"
              :key="wordJp"
              :ref="(element) => setRowElement(wordJp, element)"
              :class="{ 'active-glossary-row': activeTerm === wordJp }"
              @click="locateTerm(wordJp)"
            >
              <td>{{ hasOwn(aiGlossary, wordJp) ? wordJp : '—' }}</td>
              <td>
                {{ hasOwn(aiGlossary, wordJp) ? aiGlossary[wordJp] : '—' }}
              </td>
              <td>
                <c-button
                  v-if="hasOwn(glossary, wordJp)"
                  :icon="DeleteOutlineOutlined"
                  text
                  type="error"
                  size="small"
                  @action="deleteTerm(wordJp)"
                />
              </td>
              <td>{{ hasOwn(glossary, wordJp) ? wordJp : '—' }}</td>
              <td style="min-width: 180px">
                <n-input
                  v-if="hasOwn(glossary, wordJp)"
                  v-model:value="glossary[wordJp]"
                  size="tiny"
                  placeholder="请输入中文翻译"
                  :input-props="{ spellcheck: false }"
                  @focus="locateTerm(wordJp)"
                />
                <span v-else>—</span>
              </td>
              <td>
                {{ aiLoadState === 'error' ? '不可确认' : wordJp }}
              </td>
              <td>
                {{
                  aiLoadState === 'error'
                    ? 'AI 数据不可用'
                    : aiLoadState === 'loading'
                      ? '加载中'
                      : mergedGlossary[wordJp]
                }}
              </td>
            </tr>
          </tbody>
        </n-table>
      </div>
      <n-empty v-else description="暂无术语" />
    </template>

    <n-table
      v-else-if="Object.keys(glossary).length !== 0"
      striped
      size="small"
      style="font-size: 12px; max-width: 400px"
    >
      <tr v-for="wordJp in Object.keys(glossary).reverse()" :key="wordJp">
        <td>
          <c-button
            :icon="DeleteOutlineOutlined"
            text
            type="error"
            size="small"
            @action="deleteTerm(wordJp)"
          />
        </td>
        <td>{{ wordJp }}</td>
        <td nowrap="nowrap">=></td>
        <td style="padding-right: 16px">
          <n-input
            v-model:value="glossary[wordJp]"
            size="tiny"
            placeholder="请输入中文翻译"
            :theme-overrides="{
              border: '0',
              color: 'transprent',
            }"
          />
        </td>
      </tr>
    </n-table>

    <template #action>
      <c-button label="提交" type="primary" @action="submitGlossary()" />
    </template>
  </c-modal>
</template>

<style scoped>
.glossary-comparison {
  overflow-x: auto;
}

.source-header {
  text-align: center;
}

.ai-header {
  background: rgb(240 247 255);
}

.human-header {
  background: rgb(246 255 237);
}

.final-header {
  background: rgb(255 247 230);
}

.active-glossary-row td {
  box-shadow: inset 0 0 0 1px rgb(24 160 88 / 45%);
}
</style>
