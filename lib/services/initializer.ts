// lib/services/initializer.ts
import { TonWatcher } from './tonWatcher'

export async function initializeServices() {
  const watcher = TonWatcher.getInstance()
  await watcher.startWatching()
}