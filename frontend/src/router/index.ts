import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/input' },
  {
    path: '/input',
    name: 'input',
    component: () => import('@/views/InputGallery.vue'),
  },
  {
    path: '/workspace/:mode?',
    name: 'workspace',
    component: () => import('@/views/Workspace.vue'),
    props: (route) => ({ mode: (route.params.mode as string) || 'cut' }),
  },
  {
    path: '/output',
    name: 'output',
    component: () => import('@/views/OutputGallery.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
