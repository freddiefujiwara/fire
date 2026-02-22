<script setup>
import { formatYen, truncate } from "@/domain/format";

const props = defineProps({
  items: { type: Array, required: true },
  sortKey: { type: String, default: "" },
  sortOrder: { type: String, default: "asc" },
});

const emit = defineEmits(["sort"]);

const toggleSort = (key) => {
  let order = "asc";
  if (props.sortKey === key && props.sortOrder === "asc") {
    order = "desc";
  }
  emit("sort", { key, order });
};

const getSortIcon = (key) => {
  if (props.sortKey !== key) return "↕";
  return props.sortOrder === "asc" ? "↑" : "↓";
};
</script>

<template>
  <div class="table-wrap">
    <h3 class="section-title">明細一覧</h3>
    <table class="stack-table">
      <thead>
        <tr>
          <th>
            <button class="sort-button" type="button" @click="toggleSort('date')">
              日付 {{ getSortIcon('date') }}
            </button>
          </th>
          <th>
            <button class="sort-button" type="button" @click="toggleSort('amount')">
              金額 {{ getSortIcon('amount') }}
            </button>
          </th>
          <th>
            <button class="sort-button" type="button" @click="toggleSort('name')">
              内容 {{ getSortIcon('name') }}
            </button>
          </th>
          <th>
            <button class="sort-button" type="button" @click="toggleSort('category')">
              カテゴリ {{ getSortIcon('category') }}
            </button>
          </th>
          <th style="text-align: center;">
            <button class="sort-button" type="button" @click="toggleSort('isTransfer')">
              振替 {{ getSortIcon('isTransfer') }}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, i) in items" :key="i">
          <td data-label="日付">{{ item.date }}</td>
          <td data-label="金額" :class="item.isTransfer ? '' : (item.amount > 0 ? 'is-positive' : 'is-negative')">
            <span class="amount-value">{{ formatYen(item.amount) }}</span>
          </td>
          <td data-label="内容" :title="item.name">{{ truncate(item.name) }}</td>
          <td data-label="カテゴリ">{{ item.category || "未分類" }}</td>
          <td data-label="振替" style="text-align: center;">
            <span v-if="item.isTransfer" title="振替">✔</span>
          </td>
        </tr>
        <tr v-if="items.length === 0">
          <td colspan="5" style="text-align: center; padding: 20px; color: var(--muted);">
            該当する明細はありません
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
