import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AssetTreemap from './AssetTreemap.vue';

describe('AssetTreemap', () => {
  const tiles = [
    { name: '年金A', value: 100000, dailyChange: 1234, profit: 100, x: 0, y: 0, width: 100, height: 100 }
  ];

  it('shows daily change by default', () => {
    const wrapper = mount(AssetTreemap, {
      props: {
        title: '保有銘柄（評価額）',
        tiles,
      },
    });

    expect(wrapper.text()).toContain('前日比');
  });

  it('hides daily change when showDailyChange is false', () => {
    const wrapper = mount(AssetTreemap, {
      props: {
        title: '保有銘柄（評価額）',
        tiles,
        showDailyChange: false,
      },
    });

    expect(wrapper.text()).not.toContain('前日比');
  });
});
