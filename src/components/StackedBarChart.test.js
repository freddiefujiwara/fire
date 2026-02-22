import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StackedBarChart from './StackedBarChart.vue';

describe('StackedBarChart', () => {
  const sampleData = [
    { label: '固定費', value: 300, color: '#38bdf8' },
    { label: '変動費', value: 200, color: '#f59e0b' },
    { label: '除外', value: 500, color: '#94a3b8' },
  ];

  it('renders title correctly', () => {
    const wrapper = mount(StackedBarChart, {
      props: {
        title: 'テストチャート',
        data: sampleData,
      },
    });
    expect(wrapper.find('.section-title').text()).toBe('テストチャート');
  });

  it('calculates total correctly and shows percentages in legend', () => {
    const wrapper = mount(StackedBarChart, {
      props: {
        title: 'Chart',
        data: sampleData,
      },
    });
    // total should be 300 + 200 + 500 = 1000
    const legendItems = wrapper.findAll('.legend li');
    expect(legendItems).toHaveLength(3);
    expect(legendItems[0].text()).toContain('30.0%'); // 固定費
    expect(legendItems[1].text()).toContain('20.0%'); // 変動費
    expect(legendItems[2].text()).toContain('50.0%'); // 除外
  });

  it('renders Fixed, Variable and Exclude segments in the bar', () => {
    const wrapper = mount(StackedBarChart, {
      props: {
        title: 'Chart',
        data: sampleData,
      },
    });
    // The background rect has fill="var(--surface-elevated)"
    const bars = wrapper.findAll('svg rect').filter(r =>
      r.attributes('fill') !== 'var(--surface-elevated)' && r.attributes('fill') !== 'transparent'
    );
    expect(bars).toHaveLength(3);

    const colors = bars.map(b => b.attributes('fill'));
    expect(colors).toContain('#38bdf8'); // Fixed
    expect(colors).toContain('#f59e0b'); // Variable
    expect(colors).toContain('#94a3b8'); // Exclude should be there
  });

  it('stacks Fixed at the bottom, Variable in middle, and Exclude on top', () => {
    const wrapper = mount(StackedBarChart, {
      props: {
        title: 'Chart',
        data: sampleData,
      },
    });
    const bars = wrapper.findAll('svg rect').filter(r =>
      r.attributes('fill') !== 'var(--surface-elevated)' && r.attributes('fill') !== 'transparent'
    );

    const fixedBar = bars.find(b => b.attributes('fill') === '#38bdf8');
    const variableBar = bars.find(b => b.attributes('fill') === '#f59e0b');
    const excludeBar = bars.find(b => b.attributes('fill') === '#94a3b8');

    const yFixed = parseFloat(fixedBar.attributes('y'));
    const yVariable = parseFloat(variableBar.attributes('y'));
    const yExclude = parseFloat(excludeBar.attributes('y'));
    const hFixed = parseFloat(fixedBar.attributes('height'));

    // In SVG, higher y value is lower on screen.
    // Stack: Fixed (Bottom) -> Variable (Middle) -> Exclude (Top)
    // So yExclude < yVariable < yFixed
    expect(yVariable).toBeLessThan(yFixed);
    expect(yExclude).toBeLessThan(yVariable);

    // Verify exact stacking: currentY starts at 150 (maxHeight + barPadding = 140 + 10)
    // hFixed = (300/1000) * 140 = 42.
    // yFixed = 150 - 42 = 108.
    expect(yFixed).toBe(108);
  });

  it('handles empty data gracefully', () => {
    const wrapper = mount(StackedBarChart, {
      props: {
        title: 'Chart',
        data: [],
      },
    });
    const bars = wrapper.findAll('svg rect').filter(r =>
      r.attributes('fill') !== 'var(--surface-elevated)' && r.attributes('fill') !== 'transparent'
    );
    expect(bars).toHaveLength(0);
  });

  it('uses valueFormatter if provided', () => {
    const wrapper = mount(StackedBarChart, {
      props: {
        title: 'Chart',
        data: sampleData,
        valueFormatter: (val) => `ABC ${val}`,
      },
    });
    expect(wrapper.find('.legend').text()).toContain('ABC 300');
  });

  it('handles missing Fixed or Variable items', () => {
    // Both missing
    const wrapper1 = mount(StackedBarChart, {
      props: { title: 'Chart', data: [{ label: 'その他', value: 100 }] },
    });
    expect(wrapper1.findAll('svg rect').filter(r =>
      r.attributes('fill') !== 'var(--surface-elevated)' && r.attributes('fill') !== 'transparent'
    )).toHaveLength(0);

    // Variable missing
    const wrapper2 = mount(StackedBarChart, {
      props: { title: 'Chart', data: [{ label: '固定費', value: 100 }] },
    });
    expect(wrapper2.findAll('svg rect').filter(r =>
      r.attributes('fill') !== 'var(--surface-elevated)' && r.attributes('fill') !== 'transparent'
    )).toHaveLength(1);

    // Fixed missing
    const wrapper3 = mount(StackedBarChart, {
      props: { title: 'Chart', data: [{ label: '変動費', value: 100 }] },
    });
    expect(wrapper3.findAll('svg rect').filter(r =>
      r.attributes('fill') !== 'var(--surface-elevated)' && r.attributes('fill') !== 'transparent'
    )).toHaveLength(1);
  });

  it('handles zero or negative values in data', () => {
    const data = [
      { label: '固定費', value: 0, color: '#38bdf8' },
      { label: '変動費', value: -10, color: '#f59e0b' },
      { label: '除外', value: 100, color: '#94a3b8' },
    ];
    const wrapper = mount(StackedBarChart, {
      props: {
        title: 'Chart',
        data,
      },
    });
    const bars = wrapper.findAll('svg rect').filter(r =>
      r.attributes('fill') !== 'var(--surface-elevated)' && r.attributes('fill') !== 'transparent'
    );
    // Only segments with value > 0 are rendered.
    // '除外' has value 100, so it should be rendered.
    expect(bars).toHaveLength(1);

    // total should be 100
    expect(wrapper.find('.legend').text()).toContain('100.0%'); // 除外 should be 100%
  });

  it('handles total zero with items present', () => {
    const data = [
      { label: '固定費', value: 0, color: '#38bdf8' },
    ];
    const wrapper = mount(StackedBarChart, {
      props: {
        title: 'Chart',
        data,
      },
    });
    expect(wrapper.find('.legend').text()).toContain('0.0%');
  });
});
