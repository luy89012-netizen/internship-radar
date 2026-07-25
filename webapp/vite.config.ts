import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          // ⚠️ antd 系必须合并成一个 chunk（拆开会循环依赖白屏）
          if (
            id.includes('/node_modules/antd/') ||
            id.includes('/node_modules/@ant-design/') ||
            id.includes('/node_modules/rc-') ||
            id.includes('@rc-component')
          ) return 'antd-vendor'
          if (
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'react-vendor'
          if (id.includes('/node_modules/react-router')) return 'router-vendor'
          if (id.includes('@supabase')) return 'supabase-vendor'
          return 'vendor'
        },
      },
    },
  },
})
