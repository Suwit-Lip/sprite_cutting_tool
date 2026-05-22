<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { WorkspaceMode } from '@/types'

const route = useRoute()
const router = useRouter()

const crumb = computed(() => {
  switch (route.name) {
    case 'input':
      return 'Input Gallery'
    case 'workspace':
      return 'Workspace'
    case 'output':
      return 'Output'
    default:
      return ''
  }
})

const isWorkspace = computed(() => route.name === 'workspace')
const currentMode = computed<WorkspaceMode>(() => (route.params.mode as WorkspaceMode) || 'cut')

const tabs: { key: WorkspaceMode; label: string }[] = [
  { key: 'cut', label: 'Cut Sprites' },
  { key: 'prompt', label: 'Prompt' },
  { key: 'tileset', label: 'Tileset' },
]

function goMode(mode: WorkspaceMode) {
  router.push({ name: 'workspace', params: { mode }, query: route.query })
}
</script>

<template>
  <header class="flex h-[52px] items-center justify-between border-b border-border bg-bg-elevated px-4">
    <div class="text-[13px] font-medium">{{ crumb }}</div>
    <div v-if="isWorkspace" class="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="rounded-sm px-3 py-1 text-[12px] transition-colors"
        :class="t.key === currentMode ? 'bg-bg-elevated text-text shadow-sm' : 'text-text-muted hover:text-text'"
        @click="goMode(t.key)"
      >
        {{ t.label }}
      </button>
    </div>
    <div class="flex items-center gap-2 text-[12px] text-text-faint">
      <kbd class="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>
    </div>
  </header>
</template>
