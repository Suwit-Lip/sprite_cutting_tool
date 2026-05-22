<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { promptApi } from '@/api'
import { useImagesStore } from '@/stores/images'
import { usePromptsStore } from '@/stores/prompts'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{ image: string }>()

const images = useImagesStore()
const prompts = usePromptsStore()
const toast = useToastStore()

const inputPrompt = ref('')
const basePrompt = ref('')
const result = ref<string | null>(null)
const loading = ref(false)
const showAdvanced = ref(false)

onMounted(() => prompts.refresh())

const imageInfo = computed(() => images.inputs.find((i) => i.name === props.image))

async function generate() {
  if (!props.image) {
    toast.danger('เลือกภาพก่อน')
    return
  }
  loading.value = true
  result.value = null
  try {
    result.value = await promptApi.generate(props.image, inputPrompt.value)
  } catch (e: any) {
    toast.danger('สร้าง prompt ล้มเหลว', e.message)
  } finally {
    loading.value = false
  }
}

async function copyResult() {
  if (!result.value) return
  await navigator.clipboard.writeText(result.value)
  toast.success('คัดลอกแล้ว')
}

async function saveResult() {
  if (!result.value) return
  try {
    await prompts.add({ image: props.image, inputPrompt: inputPrompt.value, prompt: result.value })
    toast.success('บันทึกแล้ว')
  } catch (e: any) {
    toast.danger('บันทึกล้มเหลว', e.message)
  }
}

async function copyHistory(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('คัดลอกแล้ว')
}
</script>

<template>
  <div class="grid h-full min-h-0" style="grid-template-columns: 1fr 360px;">
    <div class="overflow-y-auto p-6">
      <div v-if="imageInfo" class="mb-4 flex items-center gap-3 rounded-lg border border-border bg-bg-elevated p-3">
        <div class="checker h-16 w-16 overflow-hidden rounded-md">
          <img :src="imageInfo.url" class="h-full w-full object-contain" />
        </div>
        <div class="flex-1">
          <div class="text-[13px] font-medium">{{ imageInfo.name }}</div>
          <div class="font-mono text-[11px] text-text-muted">{{ imageInfo.width }}×{{ imageInfo.height }}</div>
        </div>
        <RouterLink to="/input" class="btn !py-1 !text-[12px]">เปลี่ยนภาพ</RouterLink>
      </div>

      <div class="mb-4">
        <div class="mb-1 flex items-center justify-between">
          <label class="text-[13px] font-medium">Prompt เสริม</label>
          <span class="font-mono text-[11px] text-text-faint">{{ inputPrompt.length }}</span>
        </div>
        <textarea
          v-model="inputPrompt"
          rows="4"
          class="w-full rounded-md border border-border bg-bg-elevated p-2.5 text-[13px]"
          placeholder="เช่น: บ้านจอมเวทย์ theme fantasy, สีอุ่น, เน้นโคมไฟ"
        ></textarea>
      </div>

      <details class="mb-4 rounded-md border border-border bg-bg-elevated p-3" @toggle="showAdvanced = !showAdvanced">
        <summary class="cursor-pointer text-[12px] text-text-muted">Base prompt (advanced)</summary>
        <textarea
          v-model="basePrompt"
          rows="3"
          class="mt-2 w-full rounded-md border border-border bg-surface p-2 font-mono text-[12px]"
          placeholder="LLM_DEFAULT_PROMPT (server-configured); ปรับที่ .env"
        ></textarea>
      </details>

      <button class="btn-primary w-full !py-2.5 text-[14px]" :disabled="loading" @click="generate">
        {{ loading ? 'กำลังสร้าง…' : 'สร้าง Prompt' }}
      </button>

      <div v-if="loading" class="mt-4 space-y-2">
        <div class="h-4 w-3/4 animate-pulse rounded bg-surface"></div>
        <div class="h-4 w-full animate-pulse rounded bg-surface"></div>
        <div class="h-4 w-1/2 animate-pulse rounded bg-surface"></div>
      </div>

      <div v-if="result" class="mt-4 rounded-lg border border-border bg-bg-elevated">
        <div class="flex items-center justify-between border-b border-border px-3 py-2">
          <div class="section-label">ผลลัพธ์</div>
          <div class="flex gap-1">
            <button class="btn !py-1 !text-[11px]" @click="copyResult">Copy</button>
            <button class="btn-primary !py-1 !text-[11px]" @click="saveResult">บันทึก</button>
          </div>
        </div>
        <pre class="whitespace-pre-wrap p-3 font-mono text-[12px]">{{ result }}</pre>
      </div>
    </div>

    <aside class="flex min-h-0 flex-col border-l border-border bg-bg-elevated">
      <div class="flex items-center justify-between border-b border-border px-4 py-3">
        <div class="section-label">History</div>
        <span class="font-mono text-[11px] text-text-faint">{{ prompts.records.length }}</span>
      </div>
      <div class="flex-1 overflow-y-auto p-3">
        <div v-if="!prompts.records.length" class="text-center text-[12px] text-text-faint">
          ยังไม่มีประวัติ
        </div>
        <div v-for="r in prompts.records" :key="r.id" class="mb-2 rounded-md border border-border bg-surface p-2.5">
          <div class="mb-1.5 flex items-center gap-2">
            <div class="font-mono text-[10px] text-text-muted">{{ r.image }}</div>
          </div>
          <div class="line-clamp-2 text-[12px]">{{ r.prompt }}</div>
          <div class="mt-1.5 flex items-center justify-between">
            <div class="font-mono text-[10px] text-text-faint">{{ new Date(r.createdAt).toLocaleString() }}</div>
            <div class="flex gap-1">
              <button class="text-[11px] text-text-muted hover:text-accent" @click="copyHistory(r.prompt)">copy</button>
              <button class="text-[11px] text-text-muted hover:text-danger" @click="prompts.remove(r.id)">trash</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>
