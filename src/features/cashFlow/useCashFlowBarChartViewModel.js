import { computed, ref } from "vue";

/**
 * Manage chart math and tooltip state for CashFlowBarChart.
 */
export function useCashFlowBarChartViewModel(props) {
  const chartContainerRef = ref(null);
  const activeTooltip = ref(null);

  const width = 800;
  const height = 300;
  const margin = { top: 30, right: 60, bottom: 50, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const range = computed(() => {
    const values = props.data.flatMap((d) =>
      props.showNet ? [d.income, d.expense, -d.expense, d.net] : [d.income, d.expense, -d.expense],
    );
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100000);

    const diff = max - min;
    const paddedMin = min - diff * 0.1;
    const paddedMax = max + diff * 0.1;

    const step = Math.pow(10, Math.floor(Math.log10(diff || 1)) - 1) * 5 || 10000;
    return {
      min: Math.floor(paddedMin / step) * step,
      max: Math.ceil(paddedMax / step) * step,
    };
  });

  /**
   * Convert left axis value to chart y position.
   */
  const yScale = (val) => {
    const { min, max } = range.value;
    const total = max - min || 1;
    return innerHeight - ((val - min) / total) * innerHeight;
  };

  const devRange = computed(() => {
    if (!props.averages) return { min: -50, max: 50 };
    const avgTotal = (props.averages.fixed + props.averages.variable) || 0;
    const avgFixed = props.averages.fixed || 0;
    const avgVariable = props.averages.variable || 0;

    const devs = props.data.flatMap((d) => {
      const lifestyle = (d.fixed || 0) + (d.variable || 0);
      const res = [];
      if (avgTotal > 0) res.push((lifestyle / avgTotal - 1) * 100);
      if (avgFixed > 0) res.push(((d.fixed || 0) / avgFixed - 1) * 100);
      if (avgVariable > 0) res.push(((d.variable || 0) / avgVariable - 1) * 100);
      return res;
    });

    if (devs.length === 0) return { min: -50, max: 50 };
    const maxAbs = Math.max(...devs.map(Math.abs), 30);
    const niceMax = Math.ceil(maxAbs / 10) * 10;
    return { min: -niceMax, max: niceMax };
  });

  /**
   * Convert right axis value to chart y position.
   */
  const yScaleRight = (val) => {
    const { min, max } = devRange.value;
    const total = max - min || 1;
    return innerHeight - ((val - min) / total) * innerHeight;
  };

  /**
   * Convert item index to chart x position.
   */
  const xScale = (i) => (i * innerWidth) / Math.max(props.data.length, 1);

  const bars = computed(() => {
    const step = innerWidth / Math.max(props.data.length, 1);
    const barWidth = step * 0.35;
    return props.data.map((d, i) => {
      const x = xScale(i) + step * 0.15;
      const y0 = yScale(0);

      const yIncome = yScale(d.income);
      const hFixed = Math.abs(yScale(-(d.fixed || 0)) - y0);
      const hVariable = Math.abs(yScale(-(d.variable || 0)) - y0);
      const hExclude = Math.abs(yScale(-(d.exclude || 0)) - y0);

      return {
        month: d.month,
        income: {
          x,
          y: Math.min(yIncome, y0),
          h: Math.abs(yIncome - y0),
          w: barWidth,
          val: d.income,
        },
        expense: {
          x: x + barWidth,
          w: barWidth,
          fixed: { y: y0, h: hFixed, val: d.fixed || 0 },
          variable: { y: y0 + hFixed, h: hVariable, val: d.variable || 0 },
          exclude: { y: y0 + hFixed + hVariable, h: hExclude, val: d.exclude || 0 },
        },
        net: { x: x + barWidth, y: yScale(d.net), val: d.net },
        deviation: props.averages
          ? {
              x: x + barWidth,
              val:
                props.averages.fixed + props.averages.variable > 0
                  ? (((d.fixed || 0) + (d.variable || 0)) / (props.averages.fixed + props.averages.variable) - 1) * 100
                  : null,
              fixedVal: props.averages.fixed > 0 ? ((d.fixed || 0) / props.averages.fixed - 1) * 100 : null,
              variableVal: props.averages.variable > 0 ? ((d.variable || 0) / props.averages.variable - 1) * 100 : null,
            }
          : null,
      };
    });
  });

  const netLinePath = computed(() => (bars.value.length ? `M ${bars.value.map((b) => `${b.net.x},${b.net.y}`).join(" L ")}` : ""));
  const deviationLinePath = computed(() => {
    const points = bars.value.filter((b) => b.deviation && b.deviation.val !== null).map((b) => `${b.deviation.x},${yScaleRight(b.deviation.val)}`);
    return points.length ? `M ${points.join(" L ")}` : "";
  });
  const fixedDeviationLinePath = computed(() => {
    const points = bars.value.filter((b) => b.deviation && b.deviation.fixedVal !== null).map((b) => `${b.deviation.x},${yScaleRight(b.deviation.fixedVal)}`);
    return points.length ? `M ${points.join(" L ")}` : "";
  });
  const variableDeviationLinePath = computed(() => {
    const points = bars.value.filter((b) => b.deviation && b.deviation.variableVal !== null).map((b) => `${b.deviation.x},${yScaleRight(b.deviation.variableVal)}`);
    return points.length ? `M ${points.join(" L ")}` : "";
  });

  const gridLines = computed(() => {
    const lines = [];
    const { min, max } = range.value;
    const count = 6;
    const step = (max - min) / count;
    for (let i = 0; i <= count; i += 1) {
      const val = min + step * i;
      lines.push({ y: yScale(val), label: Math.round(val).toLocaleString() });
    }
    return lines;
  });

  const rightGridLines = computed(() => {
    if (!props.averages || props.averages.fixed + props.averages.variable <= 0) return [];
    const { min, max } = devRange.value;
    const steps = [min, min / 2, 0, max / 2, max].filter((v, i, a) => a.indexOf(v) === i);
    return steps.map((val) => ({
      y: yScaleRight(val),
      label: `${val > 0 ? "+" : ""}${Math.round(val)}%`,
      isZero: Math.round(val) === 0,
    }));
  });

  /**
   * Format number as yen text.
   */
  const formatYen = (value) => `¥${Math.round(value).toLocaleString()}`;

  /**
   * Show tooltip near pointer position.
   */
  const showTooltip = (event, item) => {
    const container = chartContainerRef.value;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    activeTooltip.value = {
      ...item,
      x: Math.min(Math.max(x + 14, 8), rect.width - 8),
      y: Math.min(Math.max(y - 10, 8), rect.height - 8),
    };
  };

  /**
   * Hide tooltip for mouse leave events.
   */
  const hideTooltip = (event) => {
    if (event?.pointerType && event.pointerType !== "mouse") return;
    activeTooltip.value = null;
  };

  /**
   * Force hide tooltip.
   */
  const clearTooltip = () => {
    activeTooltip.value = null;
  };

  return {
    chartContainerRef,
    activeTooltip,
    width,
    height,
    margin,
    innerWidth,
    innerHeight,
    range,
    yScale,
    yScaleRight,
    bars,
    netLinePath,
    deviationLinePath,
    fixedDeviationLinePath,
    variableDeviationLinePath,
    gridLines,
    rightGridLines,
    formatYen,
    showTooltip,
    hideTooltip,
    clearTooltip,
  };
}
