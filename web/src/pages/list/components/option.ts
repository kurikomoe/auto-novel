export interface NovelListSelectOption {
  label: string;
  tags: string[];
  multiple?: boolean;
  show?: boolean;
}

export interface NovelListSearchOption {
  label: string;
  history: 'web' | 'wenku';
}

export type NovelListOption = NovelListSelectOption | NovelListSearchOption;

export function getWebNovelOptions(allowNsfw: boolean): NovelListOption[] {
  return [
    {
      label: '搜索',
      history: 'web',
    },
    {
      label: '来源',
      tags: [
        'Kakuyomu',
        '成为小说家吧',
        'Novelup',
        'Hameln',
        'Pixiv',
        'Alphapolis',
      ],
      multiple: true,
    },
    {
      label: '类型',
      tags: ['全部', '连载中', '已完结', '短篇'],
    },
    {
      label: '分级',
      tags: ['全部', '一般向', 'R18'],
      show: allowNsfw,
    },
    {
      label: '翻译',
      tags: ['全部', 'GPT', 'Sakura'],
    },
    {
      label: '排序',
      tags: ['更新', '点击', '相关'],
    },
  ];
}

export function getWenkuNovelOptions(allowNsfw: boolean): NovelListOption[] {
  return [
    {
      label: '搜索',
      history: 'wenku',
    },
    {
      label: '分级',
      tags: allowNsfw ? ['一般向', '成人向', '严肃向'] : ['一般向', '严肃向'],
    },
  ];
}
