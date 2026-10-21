import { test, expect, type Page } from '@playwright/test'

const DUCKS_QUESTION = 'Ducks like bread'
const DUCKS_ANSWER = 'Ducks think breadcrumbs are cryptocurrency with excellent UX.'

async function sendAndWaitForReply(page: Page, text: string) {
  const composer = page.getByTestId('chat-input')
  const replies = page.getByTestId('message-assistant')
  const before = await replies.count()

  await expect(composer).toBeEnabled({ timeout: 15_000 })
  await composer.fill(text)
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(replies).toHaveCount(before + 1)
}

test.describe('Homework 2: Locators & actions', () => {
  test('searching finds a sent message, and clearing the query resets the view', async ({ page }) => {
    await page.goto('/')
    await sendAndWaitForReply(page, DUCKS_QUESTION)
    await sendAndWaitForReply(page, 'Programmers unite')

    await page.getByTestId('nav-tab-search').click()
    await expect(page).toHaveURL(/\/search$/)

    const searchBox = page.getByRole('searchbox', { name: 'Search' })
    const hint = page.getByText('Enter text to search your local history.')
    const items = page.locator('li.search-results__item')

    await searchBox.fill('Ducks')
    await expect(hint).toBeHidden()
    await expect(items).toHaveCount(1)
    await expect(items.locator('.history-exchange__text')).toHaveText([
      DUCKS_QUESTION,
      DUCKS_ANSWER,
    ])
    await expect(items).not.toContainText('Programmers')

    await searchBox.clear()
    await expect(searchBox).toHaveValue('')
    await expect(hint).toBeVisible()
    await expect(items).toHaveCount(0)
  })
})
