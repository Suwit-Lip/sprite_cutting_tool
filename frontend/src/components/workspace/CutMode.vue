<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { cutApi } from '@/api'
import { useDebouncedFn } from '@/composables/useDebouncedFn'
import { useImagesStore } from '@/stores/images'
import { useToastStore } from '@/stores/toast'
import type { AnalyzeResponse, Box, CutParams, Rect, SplitEntry } from '@/types'
import CutCanvas from './CutCanvas.vue'
import CutSettings from './CutSettings.vue'

const props = defineProps<{ image: string }>()

const images = useImagesStore()
const toast = useToastStore()

const DEFAULT_PARAMS: CutParams = {
  bgThreshold: 245,
  minSize: 400,
  groupDilate: 2,
  padding: 4,
  keepShadow: true,
  alphaMode: 'remove',
  noiseReduction: 2,
}

interface SplitLeaf {
  id: number
  x: number
  y: number
  w: number
  h: number
}

const params = ref<CutParams>({ ...DEFAULT_PARAMS })
const baseBoxes = ref<Box[]>([])
const excluded = ref<Set<number>>(new Set())
const selected = ref<Set<number>>(new Set())
const merges = ref<Array<{ id: number; boxIds: number[] }>>([])
// splits keyed by sorted-members-joined-with-comma string.
// e.g., "42" for a single component, "12,42,43" for a merge group.
const splits = ref<Map<string, SplitLeaf[]>>(new Map())
// Map split leaf id → its origin key, so we can find the right splits entry.
const leafOrigin = new Map<number, string>()
let nextLeafId = 1_000_000
const splitMode = ref<'none' | 'v' | 'h'>('none')

const editMode = ref<'auto' | 'manual'>('auto')
const analysis = ref<AnalyzeResponse | null>(null)
const previewing = ref(false)
const cutting = ref(false)
const cutProgress = ref<{ current: number; total: number } | null>(null)

const imageInfo = computed(() => images.inputs.find((i) => i.name === props.image))
const imageUrl = computed(() => (props.image ? `/api/input/file/${encodeURIComponent(props.image)}` : ''))

function membersKey(members: number[]): string {
  return [...members].sort((a, b) => a - b).join(',')
}

interface LogicalBox {
  id: number
  members: number[]
  x: number
  y: number
  w: number
  h: number
}

// Pre-split logical boxes (one per component or merged group).
const logicalBoxes = computed<LogicalBox[]>(() => {
  const mergedMembers = new Set<number>()
  for (const m of merges.value) for (const id of m.boxIds) mergedMembers.add(id)

  const out: LogicalBox[] = []
  for (const b of baseBoxes.value) {
    if (mergedMembers.has(b.id) || excluded.value.has(b.id)) continue
    out.push({ id: b.id, members: [b.id], x: b.x, y: b.y, w: b.w, h: b.h })
  }
  for (const m of merges.value) {
    const members = baseBoxes.value.filter((b) => m.boxIds.includes(b.id))
    if (!members.length) continue
    const x0 = Math.min(...members.map((b) => b.x))
    const y0 = Math.min(...members.map((b) => b.y))
    const x1 = Math.max(...members.map((b) => b.x + b.w))
    const y1 = Math.max(...members.map((b) => b.y + b.h))
    out.push({ id: m.id, members: m.boxIds, x: x0, y: y0, w: x1 - x0, h: y1 - y0 })
  }
  return out
})

// Final display boxes — logical boxes optionally expanded into split leaves.
const displayBoxes = computed<(Box & { state: 'normal' | 'selected' | 'excluded' | 'merged' })[]>(() => {
  const out: (Box & { state: 'normal' | 'selected' | 'excluded' | 'merged' })[] = []
  // Excluded base ids → still render as 'excluded' state so user sees what's off
  for (const b of baseBoxes.value) {
    if (excluded.value.has(b.id)) {
      out.push({ ...b, state: 'excluded' })
    }
  }
  for (const lb of logicalBoxes.value) {
    const key = membersKey(lb.members)
    const leaves = splits.value.get(key)
    if (leaves && leaves.length) {
      for (const leaf of leaves) {
        const state = selected.value.has(leaf.id)
          ? 'selected'
          : lb.members.length > 1
          ? 'merged'
          : 'normal'
        out.push({ id: leaf.id, x: leaf.x, y: leaf.y, w: leaf.w, h: leaf.h, state })
      }
      continue
    }
    const state = selected.value.has(lb.id)
      ? 'selected'
      : lb.members.length > 1
      ? 'merged'
      : 'normal'
    out.push({ id: lb.id, x: lb.x, y: lb.y, w: lb.w, h: lb.h, state })
  }
  return out
})

const visibleCount = computed(
  () => displayBoxes.value.filter((b) => b.state !== 'excluded').length,
)
const excludedCount = computed(() => excluded.value.size)
const mergedCount = computed(() => merges.value.length)
const splitCount = computed(() => {
  let n = 0
  for (const arr of splits.value.values()) if (arr.length > 1) n += arr.length - 1
  return n
})

async function runAnalyze() {
  if (!props.image) return
  try {
    analysis.value = await cutApi.analyze(props.image)
    params.value = { ...analysis.value.suggested }
    resetEdits()
    editMode.value = analysis.value.mixedSizeWarning ? 'manual' : 'auto'
    await runPreview()
  } catch (e: any) {
    toast.danger('Analyze ล้มเหลว', e.message)
  }
}

async function runPreview() {
  if (!props.image) return
  previewing.value = true
  try {
    const res = await cutApi.preview(props.image, params.value)
    baseBoxes.value = res.boxes
  } catch (e: any) {
    toast.danger('Preview ล้มเหลว', e.message)
  } finally {
    previewing.value = false
  }
}

const debouncedPreview = useDebouncedFn(() => runPreview(), 150)

watch(
  () => ({ ...params.value }),
  () => debouncedPreview(),
  { deep: true },
)

watch(() => props.image, () => { runAnalyze() }, { immediate: false })

onMounted(() => {
  if (props.image) runAnalyze()
})

function onBoxClick(box: Box, e: MouseEvent) {
  if (editMode.value !== 'manual') return
  // In split mode, clicks on the selected box trigger the split — handled in CutCanvas.
  if (splitMode.value !== 'none') return
  if (e.altKey) {
    if (box.id >= 1_000_000) {
      // Split leaf — remove it from its splits entry
      removeLeaf(box.id)
    } else if (box.id < 0) {
      merges.value = merges.value.filter((m) => m.id !== box.id)
    } else {
      excluded.value.add(box.id)
      excluded.value = new Set(excluded.value)
    }
    selected.value.delete(box.id)
    selected.value = new Set(selected.value)
    return
  }
  if (e.shiftKey) {
    if (selected.value.has(box.id)) selected.value.delete(box.id)
    else selected.value.add(box.id)
  } else {
    selected.value = new Set([box.id])
    return
  }
  selected.value = new Set(selected.value)
}

function onMarquee(ids: number[], shift: boolean) {
  if (editMode.value !== 'manual') return
  const next = shift ? new Set(selected.value) : new Set<number>()
  for (const id of ids) next.add(id)
  selected.value = next
}

function clearSelection() {
  selected.value = new Set()
  splitMode.value = 'none'
}

function excludeSelected() {
  for (const id of selected.value) {
    if (id >= 1_000_000) {
      removeLeaf(id)
    } else if (id < 0) {
      merges.value = merges.value.filter((m) => m.id !== id)
    } else {
      excluded.value.add(id)
    }
  }
  excluded.value = new Set(excluded.value)
  selected.value = new Set()
}

function mergeSelected() {
  const ids = Array.from(selected.value).filter((id) => id < 1_000_000)
  if (ids.length < 2) return
  const baseIds: number[] = []
  for (const id of ids) {
    if (id < 0) {
      const m = merges.value.find((x) => x.id === id)
      if (m) baseIds.push(...m.boxIds)
    } else {
      baseIds.push(id)
    }
  }
  const uniq = Array.from(new Set(baseIds))
  merges.value = merges.value.filter((m) => !m.boxIds.some((id) => uniq.includes(id)))
  const newId = -(merges.value.length + 1) * 100 - Math.floor(Math.random() * 90)
  merges.value.push({ id: newId, boxIds: uniq })
  selected.value = new Set()
}

function resetEdits() {
  excluded.value = new Set()
  selected.value = new Set()
  merges.value = []
  splits.value = new Map()
  leafOrigin.clear()
  splitMode.value = 'none'
}

function startSplit(direction: 'v' | 'h') {
  if (selected.value.size !== 1) return
  splitMode.value = direction
}

// Find which logical box a given display id belongs to (handles split leaves).
function findOriginForId(id: number): { key: string; leaves: SplitLeaf[]; box: LogicalBox } | null {
  if (id >= 1_000_000) {
    const key = leafOrigin.get(id)
    if (!key) return null
    const leaves = splits.value.get(key) ?? []
    const box = logicalBoxes.value.find((b) => membersKey(b.members) === key)
    if (!box) return null
    return { key, leaves, box }
  }
  // Direct logical box id
  const box = logicalBoxes.value.find((b) => b.id === id)
  if (!box) return null
  const key = membersKey(box.members)
  const leaves = splits.value.get(key) ?? []
  return { key, leaves, box }
}

// Split a box (or sub-leaf) at imageX (for vertical) or imageY (for horizontal).
function commitSplit(targetId: number, axis: 'v' | 'h', pos: number) {
  const origin = findOriginForId(targetId)
  if (!origin) return
  const { key, leaves, box } = origin

  // Determine the rect being split: either an existing leaf, or the box itself.
  let targetLeaf: SplitLeaf
  if (targetId >= 1_000_000) {
    const found = leaves.find((l) => l.id === targetId)
    if (!found) return
    targetLeaf = found
  } else {
    targetLeaf = { id: -1, x: box.x, y: box.y, w: box.w, h: box.h }
  }

  // Clamp pos inside the target rect, leave ≥1 px on each side.
  let newLeaves: SplitLeaf[]
  if (axis === 'v') {
    const p = Math.max(targetLeaf.x + 1, Math.min(targetLeaf.x + targetLeaf.w - 1, Math.round(pos)))
    newLeaves = [
      { id: nextLeafId++, x: targetLeaf.x, y: targetLeaf.y, w: p - targetLeaf.x, h: targetLeaf.h },
      { id: nextLeafId++, x: p, y: targetLeaf.y, w: targetLeaf.x + targetLeaf.w - p, h: targetLeaf.h },
    ]
  } else {
    const p = Math.max(targetLeaf.y + 1, Math.min(targetLeaf.y + targetLeaf.h - 1, Math.round(pos)))
    newLeaves = [
      { id: nextLeafId++, x: targetLeaf.x, y: targetLeaf.y, w: targetLeaf.w, h: p - targetLeaf.y },
      { id: nextLeafId++, x: targetLeaf.x, y: p, w: targetLeaf.w, h: targetLeaf.y + targetLeaf.h - p },
    ]
  }
  for (const l of newLeaves) leafOrigin.set(l.id, key)

  if (leaves.length === 0) {
    splits.value.set(key, newLeaves)
  } else {
    const idx = leaves.findIndex((l) => l.id === targetId)
    if (idx < 0) return
    const next = [...leaves]
    leafOrigin.delete(targetId)
    next.splice(idx, 1, ...newLeaves)
    splits.value.set(key, next)
  }
  splits.value = new Map(splits.value)
  selected.value = new Set()
  splitMode.value = 'none'
}

function removeLeaf(leafId: number) {
  const key = leafOrigin.get(leafId)
  if (!key) return
  const leaves = splits.value.get(key)
  if (!leaves) return
  const next = leaves.filter((l) => l.id !== leafId)
  leafOrigin.delete(leafId)
  if (next.length === 0) {
    splits.value.delete(key)
  } else {
    splits.value.set(key, next)
  }
  splits.value = new Map(splits.value)
}

function applyParams(next: CutParams) {
  params.value = { ...next }
}

function buildSplitsPayload(): SplitEntry[] {
  const out: SplitEntry[] = []
  for (const [key, leaves] of splits.value.entries()) {
    if (leaves.length < 2) continue
    const members = key.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
    const rects: Rect[] = leaves.map((l) => ({ x: l.x, y: l.y, w: l.w, h: l.h }))
    out.push({ members, rects })
  }
  return out
}

async function runCut() {
  if (!props.image) return
  cutting.value = true
  cutProgress.value = { current: 0, total: visibleCount.value }
  try {
    const res = await cutApi.execute(
      props.image,
      params.value,
      Array.from(excluded.value),
      merges.value.map((m) => m.boxIds),
      buildSplitsPayload(),
    )
    await images.refreshOutputs()
    toast.success(`ตัด ${res.count} ชิ้น`, `บันทึกใน ${res.outputDir}/`, {
      label: 'ดูที่ Output',
      run: () => {
        location.hash = ''
        history.pushState({}, '', '/output')
        dispatchEvent(new PopStateEvent('popstate'))
      },
    })
  } catch (e: any) {
    toast.danger('ตัดล้มเหลว', e.message)
  } finally {
    cutting.value = false
    cutProgress.value = null
  }
}
</script>

<template>
  <div v-if="!image" class="grid h-full place-items-center text-text-muted">
    เลือกภาพจาก <RouterLink to="/input" class="ml-1 text-accent underline">Input Gallery</RouterLink> ก่อน
  </div>
  <div v-else class="grid h-full min-h-0" style="grid-template-columns: 1fr 320px;">
    <CutCanvas
      :image-url="imageUrl"
      :image-info="imageInfo"
      :boxes="displayBoxes"
      :edit-mode="editMode"
      :visible-count="visibleCount"
      :excluded-count="excludedCount"
      :merged-count="mergedCount"
      :split-count="splitCount"
      :previewing="previewing"
      :cutting="cutting"
      :cut-progress="cutProgress"
      :selected-count="selected.size"
      :can-merge="selected.size >= 2"
      :can-split="selected.size === 1"
      :split-mode="splitMode"
      :selected-ids="selected"
      @box-click="onBoxClick"
      @marquee="onMarquee"
      @clear-selection="clearSelection"
      @exclude-selected="excludeSelected"
      @merge-selected="mergeSelected"
      @start-split="startSplit"
      @commit-split="commitSplit"
      @cancel-split="splitMode = 'none'"
    />
    <CutSettings
      :params="params"
      :analysis="analysis"
      :edit-mode="editMode"
      :visible-count="visibleCount"
      @update:params="applyParams"
      @update:edit-mode="(v) => (editMode = v)"
      @analyze="runAnalyze"
      @reset-edits="resetEdits"
      @cut="runCut"
      :image-name="image"
    />
  </div>
</template>
