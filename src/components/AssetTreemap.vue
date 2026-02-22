<script setup>
import { formatYen, formatSignedYen } from "@/domain/format";
import { signedClass } from "@/domain/signed";

const props = defineProps({
  title: { type: String, required: true },
  tiles: { type: Array, required: true },
  showDailyChange: { type: Boolean, default: true },
});

const MIN_FONT_SIZE_PX = 10;
const MAX_FONT_SIZE_PX = 52;
const AREA_LOG_WEIGHT = 0.78;
const VALUE_WEIGHT = 0.22;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function tileAreaRatio(tile) {
  const areaPercent = (tile.width || 0) * (tile.height || 0);
  return clamp(areaPercent / 10000, 0, 1);
}

function maxTileValue(tiles) {
  if (!Array.isArray(tiles) || !tiles.length) {
    return 1;
  }
  return Math.max(1, ...tiles.map(tile => tile.value || 0));
}

function tileFontSizePx(tile, tiles) {
  const areaRatio = tileAreaRatio(tile);
  const areaScale = Math.log1p(areaRatio * 50) / Math.log1p(50);
  const valueScale = clamp((tile.value || 0) / maxTileValue(tiles), 0, 1);
  const blendedScale = clamp((areaScale * AREA_LOG_WEIGHT) + (valueScale * VALUE_WEIGHT), 0, 1);
  return MIN_FONT_SIZE_PX + (MAX_FONT_SIZE_PX - MIN_FONT_SIZE_PX) * blendedScale;
}

function tileLineClamp(tile) {
  const areaRatio = tileAreaRatio(tile);
  if (areaRatio > 0.18) return 4;
  if (areaRatio > 0.09) return 3;
  if (areaRatio > 0.03) return 2;
  return 1;
}

function compactTileName(name, tile) {
  const safeName = String(name || "名称未設定");
  const areaRatio = tileAreaRatio(tile);

  if (areaRatio < 0.006) {
    return `${safeName.slice(0, 2)}…`;
  }
  if (areaRatio < 0.015) {
    return `${safeName.slice(0, 4)}…`;
  }
  if (areaRatio < 0.03) {
    return `${safeName.slice(0, 7)}…`;
  }
  return safeName;
}

function tilePaddingPx(tile) {
  const areaRatio = tileAreaRatio(tile);
  if (areaRatio < 0.01) return 2;
  if (areaRatio < 0.025) return 4;
  if (areaRatio < 0.08) return 6;
  return 10;
}

function tileStyle(tile, tiles) {
  return {
    left: `${tile.x}%`,
    top: `${tile.y}%`,
    width: `${tile.width}%`,
    height: `${tile.height}%`,
    "--tile-font-size": `${tileFontSizePx(tile, tiles)}px`,
    "--tile-line-clamp": tileLineClamp(tile),
    "--tile-padding": `${tilePaddingPx(tile)}px`,
  };
}
</script>

<template>
  <section class="table-wrap">
    <h3 class="section-title">
      <slot name="title">{{ title }}</slot>
    </h3>
    <div class="stock-tile-grid">
      <article
        v-for="tile in tiles"
        :key="`${tile.name}-${tile.value}`"
        class="stock-tile"
        :class="tile.isNegative ? 'is-negative-box' : 'is-positive-box'"
        tabindex="0"
        :aria-label="`${tile.name} 評価額 ${formatYen(tile.value)}`"
        :style="tileStyle(tile, props.tiles)"
      >
        <p class="stock-tile-name" :title="tile.name">{{ compactTileName(tile.name, tile) }}</p>
        <span class="stock-tile-tooltip" role="tooltip">
          <div class="tooltip-content">
            <strong>{{ tile.name }}</strong><br>
            評価額: <span class="amount-value">{{ formatYen(tile.value) }}</span>
            <template v-if="props.showDailyChange && tile.dailyChange != null">
              <br>前日比: <span :class="signedClass(tile.dailyChange)">{{ formatSignedYen(tile.dailyChange) }}</span>
            </template>
            <template v-if="tile.profit != null">
              <br>評価損益: <span :class="signedClass(tile.profit)">{{ formatSignedYen(tile.profit) }}</span>
            </template>
            <template v-if="tile.details && tile.details.length > 1">
              <hr class="tooltip-divider">
              <div class="tooltip-details">
                <div v-for="(detail, idx) in tile.details" :key="idx" class="detail-row">
                  <small>{{ detail.institution }}: {{ formatYen(detail.value) }}</small>
                </div>
              </div>
            </template>
          </div>
        </span>
      </article>
    </div>
  </section>
</template>

<style scoped>
.tooltip-content {
  text-align: left;
}
.tooltip-divider {
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin: 4px 0;
}
.detail-row {
  white-space: nowrap;
}
</style>
