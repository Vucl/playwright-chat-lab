import { test, expect, type Page } from '@playwright/test'

const exchanges = [
  {
    question: 'Queue up the tests',
    answer: 'Queue is just Q with four impatient friends standing behind it.',
  },
  {
    question: 'Programmers unite',
    answer: 'Programmers don’t panic; we just `console.log` our feelings.',
  },
]

async function ask(page: Page, question: string) {
  const composer = page.getByPlaceholder('Type a message…')
  await composer.fill(question)
  await composer.press('Enter')
  await expect(composer).toBeEmpty()
}

test.describe('Homework 1: Getting started', () => {
  test('sending two messages shows their expected replies', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('chat-input')).toBeEnabled({ timeout: 15_000 })

    const replies = page.getByTestId('message-assistant')

    for (const [index, { question, answer }] of exchanges.entries()) {
      await ask(page, question)
      await expect(replies).toHaveCount(index + 1)
      await expect(replies.nth(index)).toHaveText(answer)
    }

    await expect(page.getByTestId('message-user')).toHaveText(
      exchanges.map((e) => e.question),
    )
  })
})
