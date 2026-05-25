<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Box, ImageInfo } from '@/types'

const props = defineProps<{
  imageUrl: string
  imageInfo?: ImageInfo
  boxes: (Box & { state: 'normal' | 'selected' | 'excluded' | 'merged' })[]
  editMode: 'auto' | 'manual'
  visibleCount: number
  excludedCount: number
  mergedCount: number
  splitCount: number
  previewing: boolean
  cutting: boolean
  cutProgress: { current: number; total: number } | null
  selectedCount: number
  canMerge: boolean
  canSplit: boolean
  splitMode: 'none' | 'v' | 'h'
  selectedIds: Set<number>
}>()

const emit = defineEmits<{
  (e: 'boxClick', box: Box, ev: MouseEvent): void
  (e: 'marquee', ids: number[], shift: boolean): void
  (e: 'clearSelection'): void
  (e: 'excludeSelected'): void
  (e: 'mergeSelected'): void
  (e: 'startSplit', direction: 'v' | 'h'): void
  (e: 'commitSplit', targetId: number, axis: 'v' | 'h', pos: number): void
  (e: 'cancelSplit'): void
}>()

const zoom = ref(1)
const showLabels = ref(true)

const imgW = computed(() => props.imageInfo?.width || 1)
const imgH = computed(() => props.imageInfo?.height || 1)

// Marquee selection state
const stageRef = ref<HTMLDivElement | null>(null)
const dragging = ref(false)
const dragStart = ref<{ x: number; y: number; shift: boolean } | null>(null)
const dragRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)

// Split preview state
const splitPreview = ref<{ targetId: number; x: number; y: number } | null>(null)
const selectedBox = computed(() => {
  if (props.selectedIds.size !== 1) return null
  const id = Array.from(props.selectedIds)[0]
  return props.boxes.find((b) => b.id === id) ?? null
})

function clientToImage(e: MouseEvent) {
  if (!stageRef.value) return { x: 0, y: 0 }
  const rect = stageRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * imgW.value
  const y = ((e.clientY - rect.top) / rect.height) * imgH.value
  return { x, y }
}

function onMouseDown(e: MouseEvent) {
  if (props.editMode !== 'manual') return
  if (props.splitMode !== 'none') return
  const target = e.target as Element
  if (target.closest('.bbox-group')) return
  const p = clientToImage(e)
  dragging.value = true
  dragStart.value = { x: p.x, y: p.y, shift: e.shiftKey }
  dragRect.value = { x: p.x, y: p.y, w: 0, h: 0 }
}

function onMouseMove(e: MouseEvent) {
  if (props.splitMode !== 'none' && selectedBox.value) {
    const p = clientToImage(e)
    // Only show preview when mouse is inside the selected box.
    const b = selectedBox.value
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      splitPreview.value = { targetId: b.id, x: p.x, y: p.y }
    } else {
      splitPreview.value = null
    }
    return
  }
  if (!dragging.value || !dragStart.value) return
  const p = clientToImage(e)
  dragRect.value = {
    x: Math.min(dragStart.value.x, p.x),
    y: Math.min(dragStart.value.y, p.y),
    w: Math.abs(p.x - dragStart.value.x),
    h: Math.abs(p.y - dragStart.value.y),
  }
}

function onMouseUp(e: MouseEvent) {
  if (props.splitMode !== 'none' && selectedBox.value && splitPreview.value) {
    const b = selectedBox.value
    const p = splitPreview.value
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      const pos = props.splitMode === 'v' ? p.x : p.y
      emit('commitSplit', b.id, props.splitMode, pos)
      splitPreview.value = null
    }
    return
  }
  if (dragging.value && dragRect.value && dragStart.value) {
    const r = dragRect.value
    const contained = props.boxes
      .filter((b) => b.state !== 'excluded')
      .filter((b) => b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h)
      .map((b) => b.id)
    if (contained.length || !dragStart.value.shift) {
      emit('marquee', contained, dragStart.value.shift)
    }
  }
  dragging.value = false
  dragStart.value = null
  dragRect.value = null
}

function zoomIn() { zoom.value = Math.min(3, zoom.value + 0.25) }
function zoomOut() { zoom.value = Math.max(0.25, zoom.value - 0.25) }
function zoomReset() { zoom.value = 1 }

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.splitMode !== 'none') {
    emit('cancelSplit')
    splitPreview.value = null
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="relative min-h-0 overflow-hidden checker">
    <!-- Status chips -->
    <div class="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
      <div class="flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated/90 px-2.5 py-1 text-[11px] backdrop-blur">
        <span class="h-1.5 w-1.5 rounded-full bg-accent"></span>
        <span>Detected <b class="font-mono">{{ visibleCount }}</b> objects</span>
      </div>
      <div v-if="excludedCount" class="flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated/90 px-2.5 py-1 text-[11px] backdrop-blur">
        <span class="h-1.5 w-1.5 rounded-full bg-danger"></span>
        <span>− <b class="font-mono">{{ excludedCount }}</b> excluded</span>
      </div>
      <div v-if="mergedCount" class="flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated/90 px-2.5 py-1 text-[11px] backdrop-blur">
        <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
        <span>⨯ <b class="font-mono">{{ mergedCount }}</b> merged</span>
      </div>
      <div v-if="splitCount" class="flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated/90 px-2.5 py-1 text-[11px] backdrop-blur">
        <span class="h-1.5 w-1.5 rounded-full bg-teal"></span>
        <span>÷ <b class="font-mono">{{ splitCount }}</b> split</span>
      </div>
      <div v-if="imageInfo" class="rounded-full border border-border bg-bg-elevated/90 px-2.5 py-1 font-mono text-[11px] text-text-muted backdrop-blur">
        {{ imageInfo.width }}×{{ imageInfo.height }}
      </div>
      <div v-if="previewing" class="rounded-full border border-border bg-bg-elevated/90 px-2.5 py-1 text-[11px] text-text-muted backdrop-blur">
        กำลังคำนวณ…
      </div>
    </div>

    <!-- Split mode banner -->
    <div
      v-if="splitMode !== 'none'"
      class="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-md border border-teal bg-bg-elevated px-3 py-1.5 text-[12px] shadow-md"
    >
      <b>Split mode ({{ splitMode === 'v' ? 'แนวตั้ง' : 'แนวนอน' }})</b>
      — ขยับเมาส์เหนือ box ที่เลือก แล้วคลิกเพื่อตัด · กด Esc เพื่อยกเลิก
    </div>

    <!-- Preview stage -->
    <div
      class="flex h-full items-center justify-center p-8"
      :class="editMode === 'manual' ? (splitMode !== 'none' ? 'cursor-crosshair' : 'cursor-crosshair') : ''"
    >
      <div
        v-if="imageInfo"
        ref="stageRef"
        class="relative max-h-full max-w-[92%] select-none shadow-lg"
        :style="{ transform: `scale(${zoom})`, transformOrigin: 'center' }"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
      >
        <img :src="imageUrl" class="pointer-events-none block max-h-[70vh] max-w-full" :style="{ width: imgW + 'px', height: 'auto' }" />
        <svg
          class="pointer-events-none absolute inset-0 h-full w-full"
          :viewBox="`0 0 ${imgW} ${imgH}`"
          preserveAspectRatio="none"
        >
          <g
            v-for="b in boxes"
            :key="b.id"
            class="bbox-group pointer-events-auto cursor-pointer"
            :class="b.state"
            @mousedown.stop
            @click.stop="emit('boxClick', b, $event)"
          >
            <rect class="bbox" :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
            <text v-if="showLabels" class="bbox-label" :x="b.x + 4" :y="b.y + 14">
              {{ String(Math.abs(b.id) % 100000).padStart(3, '0') }}
            </text>
          </g>
          <rect
            v-if="dragRect"
            :x="dragRect.x"
            :y="dragRect.y"
            :width="dragRect.w"
            :height="dragRect.h"
            fill="var(--teal)"
            fill-opacity="0.1"
            stroke="var(--teal)"
            stroke-width="1.5"
            stroke-dasharray="4 3"
            vector-effect="non-scaling-stroke"
          />
          <!-- Split preview line -->
          <template v-if="splitMode !== 'none' && splitPreview && selectedBox">
            <line
              v-if="splitMode === 'v'"
              :x1="splitPreview.x" :y1="selectedBox.y"
              :x2="splitPreview.x" :y2="selectedBox.y + selectedBox.h"
              stroke="var(--teal)"
              stroke-width="2"
              stroke-dasharray="6 4"
              vector-effect="non-scaling-stroke"
            />
            <line
              v-else
              :x1="selectedBox.x" :y1="splitPreview.y"
              :x2="selectedBox.x + selectedBox.w" :y2="splitPreview.y"
              stroke="var(--teal)"
              stroke-width="2"
              stroke-dasharray="6 4"
              vector-effect="non-scaling-stroke"
            />
          </template>
        </svg>
      </div>
    </div>

    <!-- Floating action bar -->
    <Transition name="actionbar">
      <div
        v-if="selectedCount > 0 && editMode === 'manual' && splitMode === 'none'"
        class="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 shadow-lg"
      >
        <span class="font-mono text-[12px] text-text-muted">{{ selectedCount }} selected</span>
        <button v-if="canMerge" class="btn-primary !py-1 !text-[12px]" @click="emit('mergeSelected')">รวมเป็นชิ้นเดียว</button>
        <button v-if="canSplit" class="btn !py-1 !text-[12px]" @click="emit('startSplit', 'v')" title="Split vertically">⫶ Split V</button>
        <button v-if="canSplit" class="btn !py-1 !text-[12px]" @click="emit('startSplit', 'h')" title="Split horizontally">⫯ Split H</button>
        <button class="btn !py-1 !text-[12px]" @click="emit('excludeSelected')">เขี่ยทิ้ง</button>
        <button class="text-text-faint hover:text-text" @click="emit('clearSelection')">×</button>
      </div>
    </Transition>

    <!-- Zoom controls -->
    <div class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-bg-elevated/94 px-2 py-1 backdrop-blur">
      <button class="rounded-sm px-2 py-1 text-[12px] hover:bg-surface-hover" @click="zoomOut">−</button>
      <span class="min-w-[44px] text-center font-mono text-[11px] text-text-muted">{{ Math.round(zoom * 100) }}%</span>
      <button class="rounded-sm px-2 py-1 text-[12px] hover:bg-surface-hover" @click="zoomIn">+</button>
      <span class="mx-1 h-3 w-px bg-border"></span>
      <button class="rounded-sm px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover" @click="zoomReset">fit</button>
      <button
        class="rounded-sm px-2 py-1 text-[11px] hover:bg-surface-hover"
        :class="showLabels ? 'text-accent' : 'text-text-muted'"
        @click="showLabels = !showLabels"
      >
        labels
      </button>
    </div>

    <!-- Cut progress overlay -->
    <div v-if="cutting" class="absolute inset-0 z-30 grid place-items-center bg-black/40 backdrop-blur-sm">
      <div class="rounded-lg border border-border bg-bg-elevated p-6 shadow-lg">
        <div class="mb-3 text-[14px] font-medium">กำลังตัดภาพ…</div>
        <div v-if="cutProgress" class="font-mono text-[12px] text-text-muted">
          {{ cutProgress.current }} / {{ cutProgress.total }}
        </div>
        <div class="mt-3 h-1 w-64 overflow-hidden rounded-full bg-surface">
          <div class="h-full bg-accent" style="width: 50%; animation: pulse 1.4s ease-in-out infinite;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.actionbar-enter-from { opacity: 0; transform: translate(-50%, 10px); }
.actionbar-enter-active, .actionbar-leave-active { transition: all 0.15s ease-out; }
.actionbar-leave-to { opacity: 0; transform: translate(-50%, 10px); }
@keyframes pulse { 0%, 100% { width: 30%; } 50% { width: 80%; } }
</style>
