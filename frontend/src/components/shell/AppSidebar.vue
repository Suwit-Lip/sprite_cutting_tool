<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useImagesStore } from '@/stores/images'

const app = useAppStore()
const images = useImagesStore()

onMounted(() => {
  images.refreshInputs()
  images.refreshOutputs()
})

const navItems = computed(() => [
  { to: '/input', label: 'Input Gallery', count: images.inputs.length },
  { to: '/workspace', label: 'Workspace', count: null as number | null },
  { to: '/output', label: 'Output', count: images.outputs.reduce((sum, g) => sum + g.count, 0) },
])

const recent = computed(() => images.inputs.slice(0, 6))
</script>

<template>
  <aside class="flex min-h-0 flex-col gap-1 border-r border-border bg-bg-elevated px-3 py-3.5">
    <div class="flex items-center gap-2.5 px-2 pb-3.5 pt-1.5">
      <div class="relative grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-lg bg-text font-mono font-semibold text-bg">
        <span class="text-[12px]">SC</span>
      </div>
      <div>
        <div class="text-[13px] font-medium">Sprite Cutter</div>
        <div class="font-mono text-[11px] text-text-faint">v0.1 · local</div>
      </div>
    </div>

    <div class="px-2 pb-1.5 pt-2 section-label">Pages</div>
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex items-center justify-between rounded-md px-3 py-2 text-[13px] hover:bg-surface-hover"
      active-class="!bg-accent-soft !text-accent"
    >
      <span>{{ item.label }}</span>
      <span
        v-if="item.count !== null && item.count > 0"
        class="rounded-full bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted"
      >
        {{ item.count }}
      </span>
    </RouterLink>

    <div v-if="recent.length" class="mt-3 px-2 pb-1.5 section-label">Recent files</div>
    <div v-if="recent.length" class="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
      <RouterLink
        v-for="img in recent"
        :key="img.name"
        :to="`/workspace/cut?image=${encodeURIComponent(img.name)}`"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover"
      >
        <img :src="img.url" class="h-6 w-6 rounded-sm object-cover" />
        <span class="truncate font-mono text-[11px] text-text-muted">{{ img.name }}</span>
      </RouterLink>
    </div>

    <div class="mt-auto flex items-center justify-between border-t border-border px-2 pt-2">
      <div class="truncate font-mono text-[11px] text-text-faint" :title="app.inputDir">
        {{ app.inputDir || 'D:\\Game Asset\\input' }}
      </div>
      <button
        class="rounded-md px-2 py-1 text-[13px] hover:bg-surface-hover"
        @click="app.toggleTheme()"
        :title="app.theme === 'light' ? 'Switch to dark' : 'Switch to light'"
      >
        {{ app.theme === 'light' ? '☾' : '☀' }}
      </button>
    </div>
  </aside>
</template>
