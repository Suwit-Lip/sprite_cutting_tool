<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { outputApi } from '@/api'
import { useImagesStore } from '@/stores/images'
import { useToastStore } from '@/stores/toast'

const images = useImagesStore()
const toast = useToastStore()
const router = useRouter()

const selected = ref<Set<string>>(new Set())
const deletedSet = ref<Set<string>>(new Set())
const undoStack = ref<{ group: string; file: string }[]>([])

onMounted(() => images.refreshOutputs())

function pieceKey(group: string, file: string) {
  return `${group}/${file}`
}

function toggle(group: string, file: string) {
  const key = pieceKey(group, file)
  if (selected.value.has(key)) selected.value.delete(key)
  else selected.value.add(key)
  selected.value = new Set(selected.value)
}

function selectAllInGroup(name: string) {
  const grp = images.outputs.find((g) => g.name === name)
  if (!grp) return
  for (const it of grp.items) selected.value.add(pieceKey(name, it.file))
  selected.value = new Set(selected.value)
}

async function deleteSelected() {
  if (!selected.value.size) return
  if (!confirm(`ลบ ${selected.value.size} ชิ้น?`)) return
  const items = Array.from(selected.value).map((k) => {
    const [group, file] = k.split('/')
    return { group, file }
  })
  try {
    const res = await outputApi.delete(items)
    for (const d of res.deleted) {
      if (d.file) deletedSet.value.add(pieceKey(d.group, d.file))
      undoStack.value.push(d)
    }
    selected.value = new Set()
    toast.success(`ลบ ${res.deleted.length} ชิ้น`, undefined, {
      label: 'คืนค่าที่ลบ',
      run: () => restoreLast(),
    })
    await images.refreshOutputs()
  } catch (e: any) {
    toast.danger('ลบล้มเหลว', e.message)
  }
}

async function deleteGroup(name: string) {
  if (!confirm(`ลบทั้งกลุ่ม "${name}"?`)) return
  try {
    await outputApi.delete([{ group: name, file: '' }])
    toast.success(`ลบกลุ่ม ${name}`)
    await images.refreshOutputs()
  } catch (e: any) {
    toast.danger('ลบกลุ่มล้มเหลว', e.message)
  }
}

function restoreLast() {
  // The Phase-1 backend physically deletes files, so "undo" only clears the
  // UI hint that something was deleted. Document for the user.
  toast.info('การลบเป็น hard delete', 'ไฟล์ถูกลบจริงในระบบไฟล์แล้ว — คืนค่าได้เฉพาะการแสดงผล')
  deletedSet.value = new Set()
  undoStack.value = []
}

async function downloadZip(group: string) {
  try {
    const files = images.outputs.find((g) => g.name === group)?.items.map((it) => it.file) ?? []
    const blob = await outputApi.zip(group, files)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group}.zip`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    toast.danger('ดาวน์โหลดล้มเหลว', e.message)
  }
}

async function downloadSelected() {
  // Group selected pieces by group.
  const byGroup: Record<string, string[]> = {}
  for (const k of selected.value) {
    const [g, f] = k.split('/')
    if (!byGroup[g]) byGroup[g] = []
    byGroup[g].push(f)
  }
  for (const [group, files] of Object.entries(byGroup)) {
    try {
      const blob = await outputApi.zip(group, files)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${group}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.danger('ดาวน์โหลดล้มเหลว', e.message)
    }
  }
}

function sendToTileset() {
  router.push({ name: 'workspace', params: { mode: 'tileset' } })
}

const hasSelection = computed(() => selected.value.size > 0)
</script>

<template>
  <section class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-[15px] font-medium">Output Gallery</h1>
        <span class="font-mono text-[11px] text-text-faint">
          {{ images.outputs.length }} groups · {{ images.outputs.reduce((s, g) => s + g.count, 0) }} ชิ้น
        </span>
      </div>
      <div v-if="!hasSelection" class="flex gap-2">
        <button class="btn" @click="images.refreshOutputs()">Refresh</button>
      </div>
      <div v-else class="flex items-center gap-2">
        <span class="font-mono text-[12px] text-text-muted">{{ selected.size }} ชิ้นถูกเลือก</span>
        <button class="btn" @click="sendToTileset">ส่งไป Tileset</button>
        <button class="btn-danger" @click="deleteSelected">ลบ</button>
        <button class="btn-primary" @click="downloadSelected">Download zip</button>
        <button class="text-text-faint hover:text-text" @click="selected = new Set()">×</button>
      </div>
    </div>

    <div v-if="!images.outputs.length" class="mt-12 text-center text-text-muted">
      ยังไม่มี output — ตัดภาพจาก
      <RouterLink to="/workspace" class="text-accent underline">Workspace</RouterLink>
      ก่อน
    </div>

    <div v-for="grp in images.outputs" :key="grp.name" class="mb-6">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h2 class="font-mono text-[13px] font-medium">{{ grp.name }}</h2>
          <span class="font-mono text-[11px] text-text-faint">{{ grp.count }} ชิ้น</span>
        </div>
        <div class="flex gap-1">
          <button class="text-[11px] text-text-muted hover:text-accent" @click="selectAllInGroup(grp.name)">เลือกทั้งหมด</button>
          <button class="text-[11px] text-text-muted hover:text-accent" @click="downloadZip(grp.name)">ดาวน์โหลด</button>
          <button class="text-[11px] text-text-muted hover:text-danger" @click="deleteGroup(grp.name)">ลบกลุ่ม</button>
        </div>
      </div>
      <div class="grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));">
        <div
          v-for="it in grp.items"
          :key="it.file"
          class="checker group relative aspect-square cursor-pointer overflow-hidden rounded-sm border border-border"
          :class="selected.has(pieceKey(grp.name, it.file)) ? '!border-accent ring-1 ring-accent' : ''"
          @click="toggle(grp.name, it.file)"
        >
          <img :src="it.url" class="absolute inset-0 h-full w-full object-contain" />
          <div class="absolute left-1 top-1 rounded-sm bg-bg-elevated/90 px-1 font-mono text-[9px] text-text-muted">
            {{ it.file.replace(/sprite_(r\d+_c\d+)\..*/, '$1') }}
          </div>
          <div
            class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-sm border border-border bg-bg-elevated/90 text-[9px] transition-opacity"
            :class="selected.has(pieceKey(grp.name, it.file)) ? 'opacity-100 !bg-accent !text-accent-fg !border-accent' : 'opacity-0 group-hover:opacity-100'"
          >
            ✓
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
