<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePresetsStore } from '@/stores/presets'
import { useToastStore } from '@/stores/toast'
import type { AlphaMode, AnalyzeResponse, CutParams, Preset } from '@/types'

const props = defineProps<{
  params: CutParams
  analysis: AnalyzeResponse | null
  editMode: 'auto' | 'manual'
  visibleCount: number
  imageName: string
}>()

const emit = defineEmits<{
  (e: 'update:params', p: CutParams): void
  (e: 'update:editMode', m: 'auto' | 'manual'): void
  (e: 'analyze'): void
  (e: 'resetEdits'): void
  (e: 'cut'): void
}>()

const presets = usePresetsStore()
const toast = useToastStore()

onMounted(() => presets.refresh())

const allPresets = computed<Preset[]>(() => [...presets.builtins, ...presets.user])
const activePreset = computed(() => allPresets.value.find((p) => presets.paramsMatch(p.params, props.params)))

function patch(key: keyof CutParams, v: number | boolean | AlphaMode) {
  emit('update:params', { ...props.params, [key]: v })
}

function applyPreset(p: Preset) {
  emit('update:params', { ...p.params })
}

const newPresetName = ref('')
const showSaveDialog = ref(false)

async function savePreset() {
  if (!newPresetName.value.trim()) return
  try {
    await presets.save(newPresetName.value.trim(), props.params)
    toast.success('บันทึก preset แล้ว', newPresetName.value)
    newPresetName.value = ''
    showSaveDialog.value = false
  } catch (e: any) {
    toast.danger('บันทึกล้มเหลว', e.message)
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-col border-l border-border bg-bg-elevated">
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Auto-suggest banner -->
      <div
        v-if="analysis"
        class="mb-4 rounded-lg p-3"
        :style="{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface))', border: '1px solid var(--border)' }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] text-accent-fg">✨</div>
            <div class="section-label !text-accent">Auto-suggest</div>
          </div>
          <div class="rounded-full bg-bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-muted">
            {{ analysis.profile }}
          </div>
        </div>
        <div class="mt-2 text-[12px] text-text-muted">{{ analysis.note }}</div>
        <button class="btn mt-2 !py-1 !text-[11px]" @click="emit('analyze')">เดาค่าใหม่</button>
      </div>

      <!-- Auto/Manual switch -->
      <div class="mb-4 flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
        <button
          class="flex-1 rounded-sm py-1 text-[12px] transition-colors"
          :class="editMode === 'auto' ? 'bg-bg-elevated shadow-sm' : 'text-text-muted'"
          @click="emit('update:editMode', 'auto')"
        >
          Auto
        </button>
        <button
          class="flex-1 rounded-sm py-1 text-[12px] transition-colors"
          :class="editMode === 'manual' ? 'bg-bg-elevated shadow-sm' : 'text-text-muted'"
          @click="emit('update:editMode', 'manual')"
        >
          Manual
        </button>
      </div>
      <div v-if="editMode === 'manual'" class="mb-4 rounded-md bg-surface p-2 text-[11px] text-text-muted">
        คลิก = เลือก · Shift+คลิก = เลือกหลายชิ้น · Alt+คลิก = เขี่ยทิ้ง · ลากบนพื้น = marquee
      </div>

      <!-- Detection sliders -->
      <div class="section-label mb-2">Detection</div>
      <div class="space-y-3">
        <div>
          <div class="flex items-center justify-between">
            <label class="text-[13px]">Background threshold</label>
            <span class="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px]">{{ params.bgThreshold }}</span>
          </div>
          <div class="text-[11px] text-text-faint">ค่าสูง = แยกพื้นหลังขาวเข้มข้น</div>
          <input
            class="slider mt-1.5"
            type="range" min="200" max="255" step="1"
            :value="params.bgThreshold"
            @input="(e) => patch('bgThreshold', Number((e.target as HTMLInputElement).value))"
          />
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-[13px]">Min size</label>
            <span class="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px]">{{ params.minSize }} px</span>
          </div>
          <div class="text-[11px] text-text-faint">กรองเศษเล็กกว่าค่านี้ออก</div>
          <input
            class="slider mt-1.5"
            type="range" min="8" max="2000" step="4"
            :value="params.minSize"
            @input="(e) => patch('minSize', Number((e.target as HTMLInputElement).value))"
          />
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-[13px]">Group / dilation</label>
            <span class="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px]">{{ params.groupDilate }} px</span>
          </div>
          <div class="text-[11px] text-text-faint">เพิ่ม = รวมชิ้นที่แตก / ลด = แยกชิ้นที่ติดกัน</div>
          <input
            class="slider mt-1.5"
            type="range" min="0" max="20" step="1"
            :value="params.groupDilate"
            @input="(e) => patch('groupDilate', Number((e.target as HTMLInputElement).value))"
          />
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-[13px]">Padding</label>
            <span class="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px]">{{ params.padding }} px</span>
          </div>
          <div class="text-[11px] text-text-faint">ขอบรอบวัตถุหลังตัด</div>
          <input
            class="slider mt-1.5"
            type="range" min="0" max="32" step="1"
            :value="params.padding"
            @input="(e) => patch('padding', Number((e.target as HTMLInputElement).value))"
          />
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-[13px]">Noise reduction</label>
            <span class="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px]">{{ params.noiseReduction }}</span>
          </div>
          <div class="text-[11px] text-text-faint">เพิ่ม = กิน texture/specks ได้มากขึ้น (เสี่ยงสูญเส้นบางๆ)</div>
          <input
            class="slider mt-1.5"
            type="range" min="1" max="5" step="1"
            :value="params.noiseReduction"
            @input="(e) => patch('noiseReduction', Number((e.target as HTMLInputElement).value))"
          />
        </div>
      </div>

      <!-- Presets -->
      <div class="section-label mb-2 mt-5">Presets</div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="p in allPresets"
          :key="p.id"
          class="chip transition-colors"
          :class="activePreset?.id === p.id ? 'chip-active' : ''"
          @click="applyPreset(p)"
        >
          ★ {{ p.name }}
        </button>
        <button
          class="chip"
          style="border-style: dashed;"
          @click="showSaveDialog = !showSaveDialog"
        >
          + บันทึกชุดนี้
        </button>
      </div>
      <div v-if="showSaveDialog" class="mt-2 flex gap-1">
        <input
          v-model="newPresetName"
          class="flex-1 rounded-sm border border-border bg-bg-elevated px-2 py-1 text-[12px]"
          placeholder="ชื่อ preset"
          @keyup.enter="savePreset"
        />
        <button class="btn-primary !py-1 !text-[11px]" @click="savePreset">บันทึก</button>
      </div>

      <!-- Background -->
      <div class="section-label mb-2 mt-5">Background</div>

      <div class="mb-2 text-[12px] text-text-muted">Alpha mode</div>
      <div class="mb-1 flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
        <button
          v-for="m in (['remove', 'keep', 'fuzzy'] as const)"
          :key="m"
          class="flex-1 rounded-sm py-1 text-[11px] capitalize transition-colors"
          :class="params.alphaMode === m ? 'bg-bg-elevated shadow-sm' : 'text-text-muted'"
          @click="patch('alphaMode', m)"
        >
          {{ m }}
        </button>
      </div>
      <div class="mb-3 text-[11px] text-text-faint">
        <template v-if="params.alphaMode === 'remove'">กิน pixel สว่างทุก pixel — ดีสำหรับ icon เข้มบนพื้นขาว</template>
        <template v-else-if="params.alphaMode === 'keep'">ใช้ outline ของวัตถุเป็น alpha — เก็บสีขาวที่อยู่ภายในไว้</template>
        <template v-else>เหมือน Keep แต่ขอบนุ่ม fade ออก ~2.5 px</template>
      </div>

      <label class="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
        <div>
          <div class="text-[13px]">Keep shadows</div>
          <div class="text-[11px] text-text-faint">เก็บเงาใต้วัตถุไว้ (เฉพาะ Remove mode)</div>
        </div>
        <input
          type="checkbox"
          :checked="params.keepShadow"
          :disabled="params.alphaMode !== 'remove'"
          @change="(e) => patch('keepShadow', (e.target as HTMLInputElement).checked)"
        />
      </label>

      <button class="btn mt-4 w-full !text-[12px]" @click="emit('resetEdits')">
        Reset manual edits
      </button>
    </div>

    <!-- Sticky footer -->
    <div class="border-t border-border bg-bg-elevated p-3">
      <div class="mb-2 text-[11px] text-text-muted">
        จะตัด <b class="font-mono">{{ visibleCount }}</b> ชิ้น → <code class="font-mono text-[11px]">output/{{ imageName.replace(/\.[^.]+$/, '') }}/</code>
      </div>
      <button class="btn-primary w-full !py-2 text-[14px]" @click="emit('cut')">
        ตัด &amp; บันทึก
      </button>
    </div>
  </div>
</template>
