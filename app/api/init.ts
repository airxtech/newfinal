// app/api/init.ts
import { TonWatcher } from '@/lib/services/tonWatcher'

export async function initializeServices() {
  const watcher = TonWatcher.getInstance()
  await watcher.startWatching()
}