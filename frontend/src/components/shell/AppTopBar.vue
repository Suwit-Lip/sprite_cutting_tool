<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const crumb = computed(() => {
  switch (route.name) {
    case 'input':
      return 'Input Gallery'
    case 'workspace':
      return `Workspace · ${(route.params.mode as string) || 'cut'}`
    case 'output':
      return 'Output'
    default:
      return ''
  }
})
</script>

<template>
  <header class="flex h-[52px] items-center justify-between border-b border-border bg-bg-elevated px-4">
    <div class="font-mono text-[12px] text-text-muted">{{ crumb }}</div>
    <div class="flex items-center gap-2 text-[12px] text-text-faint">
      <kbd class="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>
    </div>
  </header>
</template>
