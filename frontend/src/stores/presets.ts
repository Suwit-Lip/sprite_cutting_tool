import { defineStore } from 'pinia'
import { ref } from 'vue'
import { presetApi } from '@/api'
import type { CutParams, Preset } from '@/types'

const BUILTINS: Preset[] = [
  { id: '__icons', name: 'Icons แน่น', params: { bgThreshold: 248, minSize: 16, groupDilate: 2, padding: 4, keepShadow: true, alphaMode: 'remove' } },
  { id: '__items', name: 'Items ห่าง', params: { bgThreshold: 240, minSize: 32, groupDilate: 4, padding: 8, keepShadow: true, alphaMode: 'remove' } },
  { id: '__objects', name: 'Objects ใหญ่', params: { bgThreshold: 235, minSize: 80, groupDilate: 8, padding: 12, keepShadow: true, alphaMode: 'keep' } },
  { id: '__soft', name: 'พื้นหลังนวลๆ', params: { bgThreshold: 220, minSize: 24, groupDilate: 6, padding: 6, keepShadow: false, alphaMode: 'fuzzy' } },
]

export const usePresetsStore = defineStore('presets', () => {
  const user = ref<Preset[]>([])

  async function refresh() {
    user.value = await presetApi.list()
  }
  async function save(name: string, params: CutParams) {
    const p = await presetApi.save(name, params)
    user.value.push(p)
  }
  async function remove(id: string) {
    await presetApi.delete(id)
    user.value = user.value.filter((p) => p.id !== id)
  }

  function paramsMatch(a: CutParams, b: CutParams) {
    return (
      a.bgThreshold === b.bgThreshold &&
      a.minSize === b.minSize &&
      a.groupDilate === b.groupDilate &&
      a.padding === b.padding &&
      a.alphaMode === b.alphaMode
    )
  }

  return { user, builtins: BUILTINS, refresh, save, remove, paramsMatch }
})
