<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { cutApi } from '@/api'
import { useDebouncedFn } from '@/composables/useDebouncedFn'
import { useImagesStore } from '@/stores/images'
import { useToastStore } from '@/stores/toast'
import type { AnalyzeResponse, Box, CutParams } from '@/types'
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

const params = ref<CutParams>({ ...DEFAULT_PARAMS })
const baseBoxes = ref<Box[]>([])
const excluded = ref<Set<number>>(new Set())
const selected = ref<Set<number>>(new Set())
const merges = ref<Array<{ id: number; boxIds: number[] }>>([])
const editMode = ref<'auto' | 'manual'>('auto')
const analysis = ref<AnalyzeResponse | null>(null)
const previewing = ref(false)
const cutting = ref(false)
const cutProgress = ref<{ current: number; total: number } | null>(null)

const imageInfo = computed(() => images.inputs.find((i) => i.name === props.image))
const imageUrl = computed(() => (props.image ? `/api/input/file/${encodeURIComponent(props.image)}` : ''))

// Display boxes = base ∖ (excluded ∪ merged-members) ∪ synth merge boxes
const displayBoxes = computed<(Box & { state: 'normal' | 'selected' | 'excluded' | 'merged' })[]>(() => {
  const mergedMembers = new Set<number>()
  for (const m of merges.value) for (const id of m.boxIds) mergedMembers.add(id)

  const out: (Box & { state: 'normal' | 'selected' | 'excluded' | 'merged' })[] = []
  for (const b of baseBoxes.value) {
    if (mergedMembers.has(b.id)) continue
    const state = excluded.value.has(b.id)
      ? 'excluded'
      : selected.value.has(b.id)
      ? 'selected'
      : 'normal'
    out.push({ ...b, state })
  }
  for (const m of merges.value) {
    const members = baseBoxes.value.filter((b) => m.boxIds.includes(b.id))
    if (!members.length) continue
    const x0 = Math.min(...members.map((b) => b.x))
    const y0 = Math.min(...members.map((b) => b.y))
    const x1 = Math.max(...members.map((b) => b.x + b.w))
    const y1 = Math.max(...members.map((b) => b.y + b.h))
    const state = selected.value.has(m.id) ? 'selected' : 'merged'
    out.push({ id: m.id, x: x0, y: y0, w: x1 - x0, h: y1 - y0, state })
  }
  return out
})

const visibleCount = computed(
  () => displayBoxes.value.filter((b) => b.state !== 'excluded').length,
)
const excludedCount = computed(() => excluded.value.size)
const mergedCount = computed(() => merges.value.length)

async function runAnalyze() {
  if (!props.image) return
  try {
    analysis.value = await cutApi.analyze(props.image)
    params.value = { ...analysis.value.suggested }
    excluded.value = new Set()
    selected.value = new Set()
    merges.value = []
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
  if (e.altKey) {
    if (excluded.value.has(box.id)) excluded.value.delete(box.id)
    else excluded.value.add(box.id)
    excluded.value = new Set(excluded.value)
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

function clearSelection() { selected.value = new Set() }

function excludeSelected() {
  for (const id of selected.value) {
    if (id < 0) {
      // Excluding a merge group: remove it from merges
      merges.value = merges.value.filter((m) => m.id !== id)
    } else {
      excluded.value.add(id)
    }
  }
  excluded.value = new Set(excluded.value)
  selected.value = new Set()
}

function mergeSelected() {
  const ids = Array.from(selected.value)
  if (ids.length < 2) return
  // Flatten any selected merge groups back into their members.
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
  // Remove member groups that contain overlapping ids
  merges.value = merges.value.filter((m) => !m.boxIds.some((id) => uniq.includes(id)))
  const newId = -(merges.value.length + 1) * 100 - Math.floor(Math.random() * 90)
  merges.value.push({ id: newId, boxIds: uniq })
  selected.value = new Set()
}

function resetEdits() {
  excluded.value = new Set()
  selected.value = new Set()
  merges.value = []
}

function applyParams(next: CutParams) {
  params.value = { ...next }
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
      :previewing="previewing"
      :cutting="cutting"
      :cut-progress="cutProgress"
      @box-click="onBoxClick"
      @marquee="onMarquee"
      @clear-selection="clearSelection"
      @exclude-selected="excludeSelected"
      @merge-selected="mergeSelected"
      :selected-count="selected.size"
      :can-merge="selected.size >= 2"
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
