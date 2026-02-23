<script setup>
import { ref } from "vue";
import { RouterView, RouterLink } from "vue-router";
import { useAppShellViewModel } from "@/features/app/useAppShellViewModel";

const {
  themeLabel,
  privacyLabel,
  togglePrivacy,
  toggleTheme,
} = useAppShellViewModel();

const isShareDialogOpen = ref(false);
const shareStatusMessage = ref("");

const openShareDialog = () => {
  shareStatusMessage.value = "";
  isShareDialogOpen.value = true;
};

const closeShareDialog = () => {
  isShareDialogOpen.value = false;
};

const shareCurrentResult = async () => {
  const shareUrl = window.location.href;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "FIRE シミュレータ",
        text: "現在の資産シミュレーション結果",
        url: shareUrl,
      });
      shareStatusMessage.value = "共有ダイアログを開きました。";
      closeShareDialog();
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    shareStatusMessage.value = "共有URLをコピーしました。";
    closeShareDialog();
  } catch {
    shareStatusMessage.value = "共有またはコピーに失敗しました。時間をおいて再度お試しください。";
  }
};
</script>

<template>
  <div class="layout">
    <header class="header">
      <h1>FIRE シミュレータ</h1>
      <div class="header-actions">
        <div class="header-buttons">
          <button class="theme-toggle" type="button" @click="togglePrivacy">
            {{ privacyLabel }}
          </button>
          <button class="theme-toggle" type="button" @click="toggleTheme">
            {{ themeLabel }}モードへ
          </button>
          <button class="theme-toggle" type="button" @click="openShareDialog">
            共有する
          </button>
          <RouterLink to="/" class="theme-toggle" style="text-decoration: none;">
            リセット
          </RouterLink>
        </div>
      </div>
    </header>
    <div v-if="isShareDialogOpen" class="share-dialog-backdrop" @click.self="closeShareDialog">
      <section class="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
        <h2 id="share-dialog-title">共有前の確認</h2>
        <p>
          この共有では、現在画面に入力されている<strong>入力値</strong>と、そこから算出された<strong>計算結果</strong>がすべて含まれます。
        </p>
        <p>
          資産状況は機密性の高い情報です。共有先は、信頼できる家族や友人のみに留めてください。
        </p>
        <p>
          共有URLは、ブラウザのブックマーク等に保存することで、現在の計算結果を後から参照・保存できます。
        </p>
        <div class="share-dialog-actions">
          <button class="theme-toggle" type="button" @click="closeShareDialog">キャンセル</button>
          <button class="theme-toggle" type="button" @click="shareCurrentResult">共有を続ける</button>
        </div>
      </section>
    </div>
    <p v-if="shareStatusMessage" class="share-status" role="status">{{ shareStatusMessage }}</p>
    <main>
      <RouterView />
    </main>
  </div>
</template>
