/**
 * Asks the browser not to evict our localStorage under pressure. iOS may still clear
 * web storage in some situations, which is why the Progress screen nudges towards exporting.
 */
export async function requestPersistentStorage(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return undefined
  }
}
