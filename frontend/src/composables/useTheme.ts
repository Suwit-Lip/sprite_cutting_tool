import { onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'

export function useTheme() {
  const app = useAppStore()
  onMounted(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') {
      app.theme = saved
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      app.theme = 'dark'
    }
    document.documentElement.dataset.theme = app.theme
  })
  watch(
    () => app.theme,
    (t) => {
      document.documentElement.dataset.theme = t
      localStorage.setItem('theme', t)
    },
  )
}
