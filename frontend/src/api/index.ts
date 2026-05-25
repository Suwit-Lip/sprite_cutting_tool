import { api } from './client'
import type {
  AnalyzeResponse,
  Box,
  CutParams,
  ImageInfo,
  Preset,
  PreviewResponse,
  PromptRecord,
  SplitEntry,
} from '@/types'

export const inputApi = {
  list: () => api.get<{ images: ImageInfo[] }>('/input/images').then((r) => r.data.images),
  setFolder: (path: string) => api.post<{ path: string }>('/input/folder', { path }).then((r) => r.data),
  upload: (files: File[]) => {
    const form = new FormData()
    for (const f of files) form.append('files', f)
    return api.post<{ uploaded: ImageInfo[]; skipped: any[] }>('/input/upload', form).then((r) => r.data)
  },
  delete: (names: string[]) =>
    api.post<{ deleted: string[]; failed: any[] }>('/input/delete', { names }).then((r) => r.data),
}

export const cutApi = {
  analyze: (image: string) => api.post<AnalyzeResponse>('/cut/analyze', { image }).then((r) => r.data),
  preview: (image: string, params: CutParams) =>
    api.post<PreviewResponse>('/cut/preview', { image, params }).then((r) => r.data),
  execute: (image: string, params: CutParams, exclude: number[], merge: number[][], splits: SplitEntry[] = []) =>
    api.post<{ count: number; outputDir: string; manifest: string }>('/cut/execute', {
      image,
      params,
      exclude,
      merge,
      splits,
    }).then((r) => r.data),
}

export const presetApi = {
  list: () => api.get<{ presets: Preset[] }>('/preset/list').then((r) => r.data.presets),
  save: (name: string, params: CutParams) =>
    api.post<Preset>('/preset/save', { name, params }).then((r) => r.data),
  delete: (id: string) => api.delete(`/preset/${id}`),
}

export const outputApi = {
  list: () =>
    api
      .get<{
        groups: { name: string; count: number; items: { file: string; url: string; w: number; h: number }[] }[]
      }>('/output/list')
      .then((r) => r.data.groups),
  setFolder: (path: string) => api.post<{ path: string }>('/output/folder', { path }).then((r) => r.data),
  delete: (items: { group: string; file: string }[]) =>
    api.post<{ deleted: any[]; failed: any[] }>('/output/delete', { items }).then((r) => r.data),
  zip: (group: string, files: string[]) => {
    return api
      .post(`/output/zip`, { group, files }, { responseType: 'blob' })
      .then((r) => r.data as Blob)
  },
}

export const promptApi = {
  generate: (image: string, inputPrompt: string) =>
    api.post<{ prompt: string }>('/prompt/generate', { image, inputPrompt }).then((r) => r.data.prompt),
  save: (record: { image: string; inputPrompt: string; prompt: string }) =>
    api.post<PromptRecord>('/prompt/save', record).then((r) => r.data),
  list: () => api.get<{ prompts: PromptRecord[] }>('/prompt/list').then((r) => r.data.prompts),
  delete: (id: string) => api.delete(`/prompt/${id}`),
}

export const tilesetApi = {
  create: (params: {
    files: string[]
    mode: 'floor' | 'wall'
    cellSize: number
    transforms: Record<string, { skewX: number; skewY: number; rotate: number; scale: number }>
  }) =>
    api
      .post<{ file: string; url: string; meta: string }>('/tileset/create', params)
      .then((r) => r.data),
}

export type { Box }
