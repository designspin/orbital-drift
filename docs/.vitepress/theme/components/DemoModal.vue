<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { withBase } from 'vitepress';

type Props = {
  src: string;
  title?: string;
  buttonLabel?: string;
};

const props = defineProps<Props>();

const isOpen = ref(false);
const label = computed(() => props.buttonLabel ?? 'Play demo');
const frameSrc = computed(() => {
  const base = withBase(props.src);
  return base.endsWith('/') ? `${base}index.html` : base;
});

const close = () => {
  isOpen.value = false;
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close();
  }
};

watch(isOpen, (open) => {
  if (open) {
    window.addEventListener('keydown', onKeyDown);
  } else {
    window.removeEventListener('keydown', onKeyDown);
  }
});

onMounted(() => {
  if (isOpen.value) {
    window.addEventListener('keydown', onKeyDown);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="demo-modal">
    <button class="demo-modal__button" type="button" @click="isOpen = true">
      {{ label }}
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="demo-modal__overlay" @click.self="close">
        <div class="demo-modal__dialog" role="dialog" aria-modal="true">
          <div class="demo-modal__header">
            <h3 class="demo-modal__title">
              {{ props.title ?? 'Demo' }}
            </h3>
            <div class="demo-modal__actions">
              <a class="demo-modal__link" :href="frameSrc" target="_blank" rel="noreferrer">
                Open in new tab
              </a>
              <button class="demo-modal__close" type="button" @click="close">✕</button>
            </div>
          </div>
          <div class="demo-modal__body">
            <iframe
              class="demo-modal__frame"
              :src="frameSrc"
              title="Demo preview"
              allow="autoplay; fullscreen; gamepad"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
            ></iframe>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
