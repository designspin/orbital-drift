<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { withBase } from 'vitepress';

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #home-hero-actions-after>
      <div class="app-store-badge">
        <a href="https://apps.apple.com/us/app/orbital-drift/id6758276794" target="_blank" rel="noreferrer">
          <img :src="withBase('/app-store-badge.svg')" alt="Download on the App Store" height="40" />
        </a>
      </div>
    </template>
  </Layout>
</template>

<style scoped>
.app-store-badge {
  display: flex;
  justify-content: center;
  padding-top: 12px;
}

.app-store-badge img {
  height: 40px;
  transition: opacity 0.2s;
}

.app-store-badge img:hover {
  opacity: 0.8;
}
</style>
