import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
    setupFiles: ['./test/setup-e2e.ts'],
    // Parallel execution across files - each file runs in isolated worker
    fileParallelism: true,
    // Use forks for full process isolation (each worker = separate Node process)
    pool: 'forks',
    // Timeouts
    testTimeout: 30000,
    hookTimeout: 60000,
  },
  plugins: [
    tsConfigPaths(),
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
})
