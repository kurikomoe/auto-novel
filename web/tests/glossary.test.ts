import { describe, expect, it } from 'vitest';

import { Glossary } from '../src/model/Glossary';

describe('AI and human glossary merge', () => {
  it('uses AI as a fallback and human values on conflicts', () => {
    expect(
      Glossary.merge(
        { 勇者: '英雄', 魔王: '魔王' },
        { 勇者: '勇者', 王: '国王' },
      ),
    ).toEqual({ 勇者: '勇者', 魔王: '魔王', 王: '国王' });
  });

  it('falls back to AI for an abnormal blank human value', () => {
    expect(Glossary.merge({ 勇者: '英雄' }, { 勇者: '' })).toEqual({
      勇者: '英雄',
    });
  });

  it('orders human rows first and appends AI-only rows', () => {
    expect(
      Glossary.comparisonTerms(
        { AI独有: 'AI', 共有: 'AI共有' },
        { 人工一: '一', 共有: '人工共有' },
      ),
    ).toEqual(['共有', '人工一', 'AI独有']);
  });
});
