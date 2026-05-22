import { defineStore } from 'pinia'
import { ref } from 'vue'
import { inputApi, outputApi } from '@/api'
import type { ImageInfo } from '@/types'

export interface OutputItem {
  file: string
  url: string
  w: number
  h: number
}
export interface OutputGroup {
  name: string
  count: number
  items: OutputItem[]
}

export const useImagesStore = defineStore('images', () => {
  const inputs = ref<ImageInfo[]>([])
  const outputs = ref<OutputGroup[]>([])
  const loading = ref(false)

  async function refreshInputs() {
    loading.value = true
    try {
      inputs.value = await inputApi.list()
    } finally {
      loading.value = false
    }
  }

  async function refreshOutputs() {
    loading.value = true
    try {
      outputs.value = await outputApi.list()
    } finally {
      loading.value = false
    }
  }

  return { inputs, outputs, loading, refreshInputs, refreshOutputs }
})
