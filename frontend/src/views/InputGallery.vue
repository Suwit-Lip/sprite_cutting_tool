<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useImagesStore } from '@/stores/images'
import { useToastStore } from '@/stores/toast'
import { inputApi } from '@/api'
import type { ImageInfo } from '@/types'

const images = useImagesStore()
const toast = useToastStore()
const router = useRouter()

const selected = ref<Set<string>>(new Set())
const lightboxImage = ref<ImageInfo | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

onMounted(() => images.refreshInputs())

function toggleSelect(name: string) {
  if (selected.value.has(name)) selected.value.delete(name)
  else selected.value.add(name)
  selected.value = new Set(selected.value)
}

async function openInWorkspace(img: ImageInfo) {
  router.push({ name: 'workspace', params: { mode: 'cut' }, query: { image: img.name } })
}

async function onUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  await handleFiles(Array.from(input.files))
  input.value = ''
}

async function handleFiles(files: File[]) {
  if (!files.length) return
  try {
    const result = await inputApi.upload(files)
    toast.success(`อัปโหลด ${result.uploaded.length} ไฟล์`, result.skipped.length ? `ข้าม ${result.skipped.length}` : undefined)
    if (result.skipped.length) {
      for (const s of result.skipped) toast.danger(`ข้าม ${s.name}`, s.reason)
    }
    await images.refreshInputs()
  } catch (e: any) {
    toast.danger('อัปโหลดล้มเหลว', e.message)
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}
function onDragLeave() {
  dragging.value = false
}
async function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  if (!e.dataTransfer?.files) return
  await handleFiles(Array.from(e.dataTransfer.files))
}

async function deleteSelected() {
  if (!selected.value.size) return
  if (!confirm(`ลบ ${selected.value.size} ไฟล์? การกระทำนี้ย้อนกลับไม่ได้`)) return
  const names = Array.from(selected.value)
  try {
    const result = await inputApi.delete(names)
    selected.value = new Set()
    toast.success(`ลบ ${result.deleted.length} ไฟล์`, result.failed.length ? `ล้มเหลว ${result.failed.length}` : undefined)
    await images.refreshInputs()
  } catch (e: any) {
    toast.danger('ลบล้มเหลว', e.message)
  }
}

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

const hasSelection = computed(() => selected.value.size > 0)
</script>

<template>
  <section
    class="relative p-6"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div
      v-if="dragging"
      class="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-accent bg-accent-soft/60"
    >
      <div class="text-[15px] font-medium text-accent">ปล่อยไฟล์เพื่ออัปโหลด</div>
    </div>

    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-[15px] font-medium">Input Gallery</h1>
        <span class="font-mono text-[11px] text-text-faint">{{ images.inputs.length }} ภาพ</span>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="hasSelection" class="btn-danger" @click="deleteSelected">
          ลบ {{ selected.size }} ไฟล์
        </button>
        <button class="btn" @click="images.refreshInputs()">Refresh</button>
        <button class="btn-primary" @click="fileInput?.click()">อัปโหลด</button>
        <input ref="fileInput" type="file" multiple accept="image/*" class="hidden" @change="onUpload" />
      </div>
    </div>

    <div
      v-if="!images.inputs.length"
      class="mt-12 flex flex-col items-center text-center"
    >
      <div class="mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">↑</div>
      <div class="text-[15px] font-medium">ยังไม่มีภาพใน folder นี้</div>
      <div class="mt-1 text-[13px] text-text-muted">ลากไฟล์มาวาง หรือกดปุ่มอัปโหลดด้านบน</div>
    </div>

    <div
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));"
    >
      <div
        v-for="img in images.inputs"
        :key="img.name"
        class="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated transition-shadow hover:shadow-md"
      >
        <button
          class="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-bg-elevated/90 text-[10px] transition-opacity"
          :class="selected.has(img.name) ? 'opacity-100 !bg-accent !text-accent-fg !border-accent' : 'opacity-0 group-hover:opacity-100'"
          @click.stop="toggleSelect(img.name)"
        >
          ✓
        </button>
        <div class="absolute right-2 top-2 z-10 rounded-sm bg-bg-elevated/90 px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
          {{ img.width }}×{{ img.height }}
        </div>
        <button class="checker relative aspect-[4/3] w-full" @click="lightboxImage = img">
          <img :src="img.url" class="absolute inset-0 h-full w-full object-contain" />
        </button>
        <div class="border-t border-border p-3">
          <div class="truncate text-[13px] font-medium">{{ img.name }}</div>
          <div class="mt-0.5 font-mono text-[11px] text-text-faint">{{ fmtSize(img.size) }}</div>
          <button class="btn-primary mt-2.5 w-full !py-1.5 !text-[12px]" @click="openInWorkspace(img)">
            เปิดใน Workspace
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="lightboxImage"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-8 backdrop-blur-sm"
      @click="lightboxImage = null"
    >
      <div class="checker relative max-h-full max-w-full overflow-hidden rounded-lg shadow-lg" @click.stop>
        <img :src="lightboxImage.url" class="max-h-[80vh] max-w-[80vw] object-contain" />
        <button
          class="btn-primary absolute bottom-4 right-4"
          @click="openInWorkspace(lightboxImage); lightboxImage = null"
        >
          เปิดใน Workspace
        </button>
        <button class="absolute right-3 top-3 text-2xl text-white" @click="lightboxImage = null">×</button>
      </div>
    </div>
  </section>
</template>
