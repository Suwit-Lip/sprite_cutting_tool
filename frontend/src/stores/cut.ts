import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Box, CutParams } from '@/types'

const DEFAULT_PARAMS: CutParams = {
  bgThreshold: 245,
  minSize: 400,
  groupDilate: 2,
  padding: 4,
  keepShadow: true,
}

export const useCutStore = defineStore('cut', () => {
  const sheetId = ref<string | null>(null)
  const params = ref<CutParams>({ ...DEFAULT_PARAMS })
  const boxes = ref<Box[]>([])
  const excluded = ref<Set<number>>(new Set())
  const selected = ref<Set<number>>(new Set())
  const merges = ref<Array<{ id: number; boxIds: number[] }>>([])
  const editMode = ref<'auto' | 'manual'>('auto')

  function resetFor(id: string, suggested?: CutParams) {
    sheetId.value = id
    params.value = suggested ? { ...suggested } : { ...DEFAULT_PARAMS }
    boxes.value = []
    excluded.value = new Set()
    selected.value = new Set()
    merges.value = []
    editMode.value = 'auto'
  }

  return { sheetId, params, boxes, excluded, selected, merges, editMode, resetFor }
})
