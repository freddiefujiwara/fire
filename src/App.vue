<script setup>
import { RouterView } from "vue-router";
import { useAppShellViewModel } from "@/features/app/useAppShellViewModel";

const {
  themeLabel,
  privacyLabel,
  togglePrivacy,
  toggleTheme,
} = useAppShellViewModel();
</script>

<template>
  <div class="layout">
    <header class="header">
      <h1>FIRE Simulator</h1>
      <div class="header-actions">
        <div class="header-buttons">
          <button class="theme-toggle" type="button" @click="togglePrivacy">
            {{ privacyLabel }}
          </button>
          <button class="theme-toggle" type="button" @click="toggleTheme">
            {{ themeLabel }}モードへ
          </button>
        </div>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
