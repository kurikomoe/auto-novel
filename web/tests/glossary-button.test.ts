// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebNovelApi } from '../src/api/novel/WebNovelApi';
import GlossaryButton from '../src/components/GlossaryButton.vue';
import type { WebNovelAiGlossaryDto } from '../src/model/WebNovel';

const messageApi = vi.hoisted(() => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('naive-ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('naive-ui')>()),
  useMessage: () => messageApi,
}));

const CButtonStub = defineComponent({
  props: { label: String },
  emits: ['action'],
  template:
    '<button :data-label="label" @click="$emit(\'action\', $event)">{{ label }}<slot /></button>',
});

const CModalStub = defineComponent({
  props: { show: Boolean },
  template:
    '<section v-if="show" class="modal"><slot name="header-extra" /><slot /><slot name="action" /></section>',
});

const NInputStub = defineComponent({
  props: {
    modelValue: { type: [String, Array], default: '' },
    pair: Boolean,
    placeholder: { type: [String, Array], default: '' },
    type: String,
  },
  emits: ['update:modelValue', 'focus'],
  setup(props, { emit }) {
    const input = (
      value: string,
      placeholder: string,
      update: (value: string) => void,
    ) =>
      h('input', {
        value,
        placeholder,
        onInput: (event: Event) =>
          update((event.target as HTMLInputElement).value),
        onFocus: () => emit('focus'),
      });

    return () => {
      if (props.pair) {
        const values = props.modelValue as string[];
        const placeholders = props.placeholder as string[];
        return h('div', { class: 'input-pair' }, [
          input(values[0] ?? '', placeholders[0] ?? '', (value) =>
            emit('update:modelValue', [value, values[1] ?? '']),
          ),
          input(values[1] ?? '', placeholders[1] ?? '', (value) =>
            emit('update:modelValue', [values[0] ?? '', value]),
          ),
        ]);
      }
      return input(
        String(props.modelValue ?? ''),
        String(props.placeholder ?? ''),
        (value) => emit('update:modelValue', value),
      );
    };
  },
});

const passthrough = (tag: string) =>
  defineComponent({
    template: `<${tag}><slot /></${tag}>`,
  });

const stubs = {
  CButton: CButtonStub,
  CModal: CModalStub,
  CA: passthrough('a'),
  NFlex: passthrough('div'),
  NText: passthrough('span'),
  NInputGroup: passthrough('div'),
  NInput: NInputStub,
  NButtonGroup: passthrough('div'),
  NTable: passthrough('table'),
  NEmpty: defineComponent({
    props: { description: String },
    template: '<div>{{ description }}</div>',
  }),
  NAlert: defineComponent({
    props: { title: String },
    template:
      '<aside class="alert"><strong>{{ title }}</strong><slot /><slot name="action" /></aside>',
  }),
};

const response = (
  glossary: Record<string, string>,
  options: Partial<WebNovelAiGlossaryDto> = {},
): WebNovelAiGlossaryDto => ({
  glossary,
  currentRevision: 100,
  status: Object.keys(glossary).length === 0 ? 'missing' : 'current',
  stale: false,
  ...options,
});

const mountGlossary = (human: Record<string, string>) => {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(GlossaryButton, {
    props: {
      gnid: { type: 'web', providerId: 'syosetu', novelId: 'n1' },
      value: human,
    },
    global: { plugins: [pinia], stubs },
  });
};

const openGlossary = async (wrapper: ReturnType<typeof mountGlossary>) => {
  await wrapper.get('[data-label^="术语表"]').trigger('click');
  await flushPromises();
  await nextTick();
};

describe('GlossaryButton AI comparison', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('VITE_API_MODE', 'local');
    localStorage.clear();
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  it('shows an empty AI source and the human-only final result', async () => {
    vi.spyOn(WebNovelApi, 'getAiGlossary').mockResolvedValue(response({}));
    const wrapper = mountGlossary({ 人工词: '人工译名' });
    await openGlossary(wrapper);

    expect(wrapper.text()).toContain('AI（只读）');
    const row = wrapper.get('tbody tr');
    const cells = row.findAll('td');
    expect(cells[0].text()).toBe('—');
    expect(cells[3].text()).toBe('人工词');
    expect(cells[5].text()).toBe('人工词');
    expect(cells[6].text()).toBe('人工译名');
  });

  it('shows AI-only, human-only and conflicting terms with human priority', async () => {
    vi.spyOn(WebNovelApi, 'getAiGlossary').mockResolvedValue(
      response({ AI独有: 'AI译名', 共有: 'AI共有译名' }),
    );
    const wrapper = mountGlossary({
      人工独有: '人工译名',
      共有: '人工共有译名',
    });
    await openGlossary(wrapper);

    const rows = wrapper.findAll('tbody tr');
    const shared = rows.find((row) => row.text().includes('共有'))!;
    expect(shared.findAll('td')[1].text()).toBe('AI共有译名');
    expect(shared.findAll('td')[6].text()).toBe('人工共有译名');

    const aiOnly = rows.find((row) => row.text().includes('AI独有'))!;
    expect(aiOnly.findAll('td')[3].text()).toBe('—');
    expect(aiOnly.findAll('td')[6].text()).toBe('AI译名');

    const humanOnly = rows.find((row) => row.text().includes('人工独有'))!;
    expect(humanOnly.findAll('td')[0].text()).toBe('—');
    expect(humanOnly.findAll('td')[6].text()).toBe('人工译名');
  });

  it('marks stale AI data while continuing to show it in the final column', async () => {
    vi.spyOn(WebNovelApi, 'getAiGlossary').mockResolvedValue(
      response(
        { 旧术语: '旧译名' },
        { stale: true, status: 'stale', generatedAt: 1_700_000_000 },
      ),
    );
    const wrapper = mountGlossary({});
    await openGlossary(wrapper);

    expect(wrapper.text()).toContain('AI 术语表已过期');
    expect(wrapper.text()).toContain('旧术语');
    expect(wrapper.get('tbody tr').findAll('td')[6].text()).toBe('旧译名');
  });

  it('shows an explicit error and retries without claiming a final result', async () => {
    const api = vi
      .spyOn(WebNovelApi, 'getAiGlossary')
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce(response({ 重试术语: '重试译名' }));
    const wrapper = mountGlossary({ 人工词: '人工译名' });
    await openGlossary(wrapper);

    expect(wrapper.text()).toContain('AI 术语表加载失败');
    expect(wrapper.text()).toContain('AI 数据不可用');
    await wrapper.get('[data-label="重试"]').trigger('click');
    await flushPromises();

    expect(api).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain('AI 术语表加载失败');
    expect(wrapper.text()).toContain('重试译名');
  });

  it('adds a human term, aligns it with AI and scrolls to the active row', async () => {
    vi.spyOn(WebNovelApi, 'getAiGlossary').mockResolvedValue(
      response({ 新词: 'AI译名' }),
    );
    const wrapper = mountGlossary({});
    await openGlossary(wrapper);

    await wrapper.get('input[placeholder="日文"]').setValue('新词');
    await wrapper.get('input[placeholder="中文"]').setValue('人工译名');
    await wrapper.get('[data-label="添加"]').trigger('click');
    await nextTick();

    const row = wrapper.get('tbody tr');
    expect(row.classes()).toContain('active-glossary-row');
    expect(row.findAll('td')[1].text()).toBe('AI译名');
    expect(row.findAll('td')[6].text()).toBe('人工译名');
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('selects and locates an existing human row', async () => {
    vi.spyOn(WebNovelApi, 'getAiGlossary').mockResolvedValue(
      response({ 已有词: 'AI译名' }),
    );
    const wrapper = mountGlossary({ 已有词: '人工译名' });
    await openGlossary(wrapper);

    const row = wrapper.get('tbody tr');
    await row.trigger('click');

    expect(row.classes()).toContain('active-glossary-row');
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('keeps the legacy single-table editor for local novels', async () => {
    const api = vi.spyOn(WebNovelApi, 'getAiGlossary');
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(GlossaryButton, {
      props: {
        gnid: { type: 'local', volumeId: 'local-1' },
        value: { 本地词: '本地译名' },
      },
      global: { plugins: [pinia], stubs },
    });
    await openGlossary(wrapper);

    expect(api).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('AI（只读）');
    expect(wrapper.text()).toContain('本地词');
  });
});
