// Mirror of backend/internal/models/types.go. Keep in sync.

export type AlphaMode = 'remove' | 'keep' | 'fuzzy'

export interface CutParams {
  bgThreshold: number
  minSize: number
  groupDilate: number
  padding: number
  keepShadow: boolean
  alphaMode: AlphaMode
}

export interface Box {
  id: number
  x: number
  y: number
  w: number
  h: number
}

export interface ImageInfo {
  name: string
  width: number
  height: number
  size: number
  url: string
}

export interface AnalyzeResponse {
  suggested: CutParams
  profile: 'dense_icons' | 'spaced' | 'mixed_size' | 'normal'
  note: string
  mixedSizeWarning: boolean
}

export interface PreviewResponse {
  count: number
  boxes: Box[]
  rows: number
}

export interface Preset {
  id: string
  name: string
  params: CutParams
}

export interface PromptRecord {
  id: string
  image: string
  inputPrompt: string
  prompt: string
  createdAt: string
}

export type WorkspaceMode = 'cut' | 'prompt' | 'tileset'
