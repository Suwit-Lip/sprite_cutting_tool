import { defineStore } from 'pinia'
import { ref } from 'vue'
import { promptApi } from '@/api'
import type { PromptRecord } from '@/types'

export const usePromptsStore = defineStore('prompts', () => {
  const records = ref<PromptRecord[]>([])

  async function refresh() {
    records.value = await promptApi.list()
  }
  async function add(record: { image: string; inputPrompt: string; prompt: string }) {
    const saved = await promptApi.save(record)
    records.value = [saved, ...records.value]
  }
  async function remove(id: string) {
    await promptApi.delete(id)
    records.value = records.value.filter((r) => r.id !== id)
  }

  return { records, refresh, add, remove }
})
