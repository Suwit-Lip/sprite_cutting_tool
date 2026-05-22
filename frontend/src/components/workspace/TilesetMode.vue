<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { tilesetApi } from '@/api'
import { useImagesStore } from '@/stores/images'
import { useToastStore } from '@/stores/toast'

const images = useImagesStore()
const toast = useToastStore()

const mode = ref<'floor' | 'wall'>('floor')
const cellSize = ref(64)
const selectedFiles = ref<Set<string>>(new Set())
const activeKey = ref<string | null>(null)
const transforms = ref<Record<string, { skewX: number; skewY: number; rotate: number; scale: number }>>({})
const creating = ref(false)

onMounted(() => images.refreshOutputs())

const allPieces = computed(() =>
  images.outputs.flatMap((g) => g.items.map((it) => ({ key: `${g.name}/${it.file}`, group: g.name, ...it }))),
)

function toggle(key: string) {
  if (selectedFiles.value.has(key)) selectedFiles.value.delete(key)
  else selectedFiles.value.add(key)
  selectedFiles.value = new Set(selectedFiles.value)
  if (selectedFiles.value.has(key)) activeKey.value = key
}

function getTransform(key: string) {
  if (!transforms.value[key]) transforms.value[key] = { skewX: 0, skewY: 0, rotate: 0, scale: 1 }
  return transforms.value[key]
}

function setTransform(key: string, k: keyof ReturnType<typeof getTransform>, v: number) {
  const t = { ...getTransform(key) }
  t[k] = v
  transforms.value[key] = t
}

async function create() {
  if (!selectedFiles.value.size) {
    toast.danger('เลือกชิ้นก่อน')
    return
  }
  creating.value = true
  try {
    const files = Array.from(selectedFiles.value)
    const tf: typeof transforms.value = {}
    for (const f of files) if (transforms.value[f]) tf[f] = transforms.value[f]
    const res = await tilesetApi.create({ files, mode: mode.value, cellSize: cellSize.value, transforms: tf })
    toast.success('สร้าง tileset สำเร็จ', res.file)
  } catch (e: any) {
    toast.danger('สร้าง tileset ล้มเหลว', e.message)
  } finally {
    creating.value = false
  }
}

const selectedList = computed(() => allPieces.value.filter((p) => selectedFiles.value.has(p.key)))
const cols = computed(() => {
  const n = selectedList.value.length
  if (mode.value === 'wall') return Math.max(1, Math.min(n, 8))
  return Math.max(1, Math.ceil(Math.sqrt(n)))
})
</script>

<template>
  <div class="grid h-full min-h-0" style="grid-template-columns: 220px 1fr 320px;">
    <!-- Piece list -->
    <aside class="min-h-0 overflow-y-auto border-r border-border bg-bg-elevated p-2">
      <div class="section-label mb-2 px-2">Pieces</div>
      <button
        v-for="p in allPieces"
        :key="p.key"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-surface-hover"
        :class="selectedFiles.has(p.key) ? '!bg-accent-soft !text-accent' : ''"
        @click="toggle(p.key)"
      >
        <div class="checker h-9 w-9 overflow-hidden rounded-sm">
          <img :src="p.url" class="h-full w-full object-contain" />
        </div>
        <span class="truncate font-mono text-[11px]">{{ p.file }}</span>
        <span v-if="selectedFiles.has(p.key)" class="ml-auto">✓</span>
      </button>
    </aside>

    <!-- Canvas -->
    <div class="checker min-h-0 overflow-auto p-6">
      <div
        v-if="selectedList.length"
        class="grid mx-auto"
        :style="{
          width: `${cols * cellSize}px`,
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        }"
      >
        <div
          v-for="p in selectedList"
          :key="p.key"
          class="relative cursor-pointer"
          :style="{ width: `${cellSize}px`, height: `${cellSize}px` }"
          :class="activeKey === p.key ? 'outline outline-2 outline-accent' : ''"
          @click="activeKey = p.key"
        >
          <img
            :src="p.url"
            class="h-full w-full object-contain"
            :style="{
              transform: `skew(${getTransform(p.key).skewX}deg, ${getTransform(p.key).skewY}deg) rotate(${getTransform(p.key).rotate}deg) scale(${getTransform(p.key).scale})`,
            }"
          />
        </div>
      </div>
      <div v-else class="grid h-full place-items-center text-text-muted">
        เลือกชิ้นจากรายการด้านซ้าย
      </div>
    </div>

    <!-- Settings -->
    <aside class="flex min-h-0 flex-col border-l border-border bg-bg-elevated">
      <div class="flex-1 overflow-y-auto p-4">
        <div class="section-label mb-2">Mode</div>
        <div class="mb-4 flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
          <button class="flex-1 rounded-sm py-1 text-[12px]" :class="mode === 'floor' ? 'bg-bg-elevated shadow-sm' : 'text-text-muted'" @click="mode = 'floor'">Floor</button>
          <button class="flex-1 rounded-sm py-1 text-[12px]" :class="mode === 'wall' ? 'bg-bg-elevated shadow-sm' : 'text-text-muted'" @click="mode = 'wall'">Wall</button>
        </div>

        <div class="section-label mb-2">Cell size</div>
        <div class="mb-4">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[12px] text-text-muted">px</span>
            <span class="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px]">{{ cellSize }}</span>
          </div>
          <input class="slider" type="range" min="32" max="128" step="16" v-model.number="cellSize" />
        </div>

        <div class="section-label mb-2">ดัดมุมต่อชิ้น</div>
        <div v-if="activeKey && selectedFiles.has(activeKey)" class="space-y-3 rounded-md border border-border bg-surface p-3">
          <div class="font-mono text-[10px] text-text-muted">{{ activeKey }}</div>
          <div v-for="key in (['skewX', 'skewY', 'rotate', 'scale'] as const)" :key="key">
            <div class="flex items-center justify-between">
              <label class="text-[12px]">{{ key }}</label>
              <span class="font-mono text-[11px]">{{ getTransform(activeKey)[key] }}</span>
            </div>
            <input
              class="slider mt-1"
              type="range"
              :min="key === 'scale' ? 0.5 : -45"
              :max="key === 'scale' ? 1.5 : 45"
              :step="key === 'scale' ? 0.05 : 1"
              :value="getTransform(activeKey)[key]"
              @input="(e) => setTransform(activeKey!, key, Number((e.target as HTMLInputElement).value))"
            />
          </div>
        </div>
        <div v-else class="rounded-md bg-surface p-3 text-[11px] text-text-muted">
          คลิกที่ชิ้นใน canvas เพื่อปรับมุม
        </div>
      </div>
      <div class="border-t border-border p-3">
        <button class="btn-primary w-full !py-2 text-[14px]" :disabled="creating" @click="create">
          {{ creating ? 'กำลังสร้าง…' : 'สร้าง Tileset' }}
        </button>
      </div>
    </aside>
  </div>
</template>
