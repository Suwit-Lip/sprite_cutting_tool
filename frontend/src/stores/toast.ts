import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'info' | 'success' | 'danger'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  description?: string
  action?: { label: string; run: () => void }
}

let nextId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function push(t: Omit<Toast, 'id'>, ttl = 4000) {
    const id = nextId++
    toasts.value.push({ id, ...t })
    setTimeout(() => dismiss(id), ttl)
    return id
  }
  function info(title: string, description?: string) {
    return push({ kind: 'info', title, description })
  }
  function success(title: string, description?: string, action?: Toast['action']) {
    return push({ kind: 'success', title, description, action })
  }
  function danger(title: string, description?: string) {
    return push({ kind: 'danger', title, description })
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }
  return { toasts, push, info, success, danger, dismiss }
})
