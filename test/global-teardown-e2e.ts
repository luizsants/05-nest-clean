// test/global-teardown-e2e.ts - Runs once after all E2E tests finish
// Cleans up test schemas created by parallel workers
import { cleanup } from './cleanup-e2e'

export function setup() {
  // no-op: setup happens per-worker in setup-e2e.ts
}

export async function teardown() {
  await cleanup()
}
