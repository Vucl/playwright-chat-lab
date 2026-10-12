import type { Page } from '@playwright/test'

// Message history lives in localStorage, so a test that needs some starts
// with it already there instead of chatting it into existence first.

const HISTORY_KEY = 'ai-assistant-chat-history-v1'

export interface Exchange {
  user: string
  assistant: string
}

/** Stores these exchanges before the app's first load, a minute apart, oldest first. */
export async function seedHistory(page: Page, exchanges: Exchange[]): Promise<void> {
  const now = Date.now()
  const stored = exchanges.map((e, i) => {
    const at = new Date(now - (exchanges.length - i) * 60_000).toISOString()
    return {
      id: `seeded-${i}`,
      userContent: e.user,
      assistantContent: e.assistant,
      userTimestamp: at,
      assistantTimestamp: at,
    }
  })
  // Only when nothing is stored yet, so a reload keeps what the app changed.
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value)
    },
    { key: HISTORY_KEY, value: JSON.stringify(stored) },
  )
}
