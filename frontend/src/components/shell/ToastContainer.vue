<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="pointer-events-auto min-w-[280px] max-w-[420px] rounded-md border bg-bg-elevated p-3 shadow-md"
        :style="{
          borderLeftWidth: '3px',
          borderLeftColor:
            t.kind === 'success' ? 'var(--success)' : t.kind === 'danger' ? 'var(--danger)' : 'var(--accent)',
        }"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="text-[13px] font-medium">{{ t.title }}</div>
            <div v-if="t.description" class="mt-0.5 text-[12px] text-text-muted">{{ t.description }}</div>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="t.action" class="btn-primary !py-1 !text-[11px]" @click="t.action.run(); toast.dismiss(t.id)">
              {{ t.action.label }}
            </button>
            <button class="text-text-faint hover:text-text" @click="toast.dismiss(t.id)">×</button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-enter-active { transition: all 0.25s ease-out; }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
.toast-leave-active { transition: all 0.15s ease-in; }
</style>
