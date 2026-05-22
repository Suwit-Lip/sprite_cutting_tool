<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const navItems = [
  { to: '/input', label: 'Input Gallery' },
  { to: '/workspace', label: 'Workspace' },
  { to: '/output', label: 'Output' },
]
</script>

<template>
  <aside class="flex min-h-0 flex-col gap-1 border-r border-border bg-bg-elevated px-3 py-3.5">
    <div class="flex items-center gap-2.5 px-2 pb-3.5 pt-1.5">
      <div class="grid h-[30px] w-[30px] place-items-center rounded-lg bg-text font-mono text-bg">SC</div>
      <div>
        <div class="text-[13px] font-medium">Sprite Cutter</div>
        <div class="font-mono text-[11px] text-text-faint">v0.1 · local</div>
      </div>
    </div>

    <div class="px-2 pb-1.5 pt-2 text-[11px] uppercase tracking-[0.08em] text-text-faint">Pages</div>
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="rounded-md px-3 py-2 text-[13px] hover:bg-surface-hover"
      active-class="bg-accent-soft text-accent"
    >
      {{ item.label }}
    </RouterLink>

    <div class="mt-auto flex items-center justify-between border-t border-border px-2 pt-2">
      <div class="truncate font-mono text-[11px] text-text-faint">{{ app.inputDir || '(no input folder)' }}</div>
      <button
        class="rounded-md px-2 py-1 text-[11px] hover:bg-surface-hover"
        @click="app.toggleTheme()"
      >
        {{ app.theme === 'light' ? '☾' : '☀' }}
      </button>
    </div>
  </aside>
</template>
