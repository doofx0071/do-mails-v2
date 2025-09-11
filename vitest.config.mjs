import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.mjs'],
    include: ['tests/contract/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/unit/**',
      'tests/e2e/**'
    ],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      '@/components': path.resolve(process.cwd(), './src/components'),
      '@/lib': path.resolve(process.cwd(), './src/lib'),
      '@/types': path.resolve(process.cwd(), './src/types'),
      '@do-mails/alias-management': path.resolve(process.cwd(), './libs/alias-management/src'),
      '@do-mails/domain-verification': path.resolve(process.cwd(), './libs/domain-verification/src'),
      '@do-mails/email-processing': path.resolve(process.cwd(), './libs/email-processing/src')
    },
  },
  esbuild: {
    target: 'node18'
  }
})
