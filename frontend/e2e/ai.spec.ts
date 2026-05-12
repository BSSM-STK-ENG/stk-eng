import { test, expect } from '@playwright/test';

function seoulDate(offsetDays: number) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays, 12));
  const shiftedParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(shifted);
  const shiftedYear = shiftedParts.find((part) => part.type === 'year')?.value ?? '';
  const shiftedMonth = shiftedParts.find((part) => part.type === 'month')?.value ?? '';
  const shiftedDay = shiftedParts.find((part) => part.type === 'day')?.value ?? '';
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

async function stubBrowserGemma(page: import('@playwright/test').Page) {
  await page.route('**/src/components/chat/browserGemma.ts*', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        export async function getBrowserGemmaStatus() {
          return true;
        }

        export async function generateBrowserGemmaResponse(_message, inventoryContext) {
          const directAnswer = inventoryContext?.match(/직접답: ([^\\n]+)/)?.[1];
          return directAnswer ?? '테스트 Gemma 응답';
        }
      `,
    });
  });
}

test.describe('AI Gemma 4 panel', () => {
  test('defaults to Gemma 4 and reports browser execution support', async ({ page }) => {
    await page.goto('/dashboard');

    const chatPanel = page.locator('aside[aria-label="채팅 패널"]');
    await expect(chatPanel.getByText('AI 질의')).toBeVisible();
    await expect(chatPanel.getByText('Gemma 4')).toBeVisible();
    await expect(chatPanel.getByText('gemma4')).toBeVisible();

    await chatPanel.getByRole('button', { name: '채팅 메뉴' }).click();
    await page.getByRole('button', { name: '설정', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'AI 설정' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '내장 Gemma 설정' })).toBeVisible();
    await expect(dialog.locator('select').first()).toHaveValue('gemma');
    await expect(dialog.locator('select').nth(1)).toHaveValue('gemma4');

    const hasWebGpu = await page.evaluate(async () => {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
      return Boolean(await gpu?.requestAdapter?.());
    });
    await dialog.getByRole('button', { name: '실행 확인' }).click();

    await expect(
      dialog.getByText(
        hasWebGpu
          ? 'API 키 없이 브라우저에서 Gemma 4를 실행할 수 있습니다.'
          : 'Gemma 4 브라우저 실행은 WebGPU를 지원하는 Chrome/Edge 데스크톱 브라우저가 필요합니다.',
      ).first(),
    ).toBeVisible();
  });

  test('quick search returns seeded inventory data from the AI panel', async ({ page }) => {
    await page.goto('/dashboard');

    const chatPanel = page.locator('aside[aria-label="채팅 패널"]');
    await chatPanel.getByPlaceholder('자재명, 코드, 거래내역 검색...').fill('AA03340001110/AAS1000001987');
    await chatPanel.getByPlaceholder('자재명, 코드, 거래내역 검색...').press('Enter');

    await expect(chatPanel.getByText('E2E slash-code material')).toBeVisible();
    await chatPanel.locator('button', { hasText: 'E2E slash-code material' }).click();

    await expect(page).toHaveURL(/\/stock\/current\?q=AA03340001110%2FAAS1000001987$/);
    await expect(page.getByRole('heading', { name: '현재 재고 조회' })).toBeVisible();
  });

  test('answers yesterday inbound inventory questions from the inventory ledger API', async ({ page }) => {
    const yesterday = seoulDate(-1);
    await stubBrowserGemma(page);
    await page.goto('/dashboard');

    const chatPanel = page.locator('aside[aria-label="채팅 패널"]');
    const ledgerResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/inventory/ledger') &&
        response.url().includes('type=IN') &&
        response.url().includes(`from=${yesterday}`) &&
        response.url().includes(`to=${yesterday}`) &&
        response.status() === 200,
    );

    await chatPanel.getByPlaceholder('재고 내용을 질문하세요 ( / 명령어 사용 가능)').fill('어제 들어온 재고가 몇 개야?');
    await chatPanel.getByRole('button', { name: '메시지 전송' }).click();
    await ledgerResponse;

    await expect(chatPanel.getByText(`어제(${yesterday}) 들어온 재고는 0개입니다.`)).toBeVisible();
    await expect(chatPanel.getByText('조회 근거 보기')).toBeVisible();
    await chatPanel.getByText('조회 근거 보기').click();
    await expect(chatPanel.getByText(`${yesterday}~${yesterday} 입고 0개, 거래 0건`)).toBeVisible();
  });
});
