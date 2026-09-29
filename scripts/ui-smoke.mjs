import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await fs.mkdir('test-results', { recursive: true });
try {
  await page.clock.install();
  await page.goto('http://localhost:5173');
  await page.getByRole('heading', { name: 'Tìm bàn hợp gu' }).waitFor();
  assert.equal(await page.locator('.room-card').count(), 6);
  await page.screenshot({ path: 'test-results/lobby-desktop.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Tìm phòng' }).fill('1024');
  assert.equal(await page.locator('.room-card').count(), 1);
  await page.getByRole('textbox', { name: 'Tìm phòng' }).fill('không có phòng này');
  await page.getByRole('heading', { name: 'Chưa tìm thấy bàn hợp gu' }).waitFor();
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await page.getByRole('button', { name: 'Vào bằng mã phòng' }).click();
  await page.getByRole('textbox', { name: 'Mã phòng' }).fill('999999');
  await page.getByRole('dialog').getByRole('button', { name: 'Vào phòng' }).click();
  await page.getByRole('alert').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tạo phòng mới' }).click();
  await page.getByRole('textbox', { name: 'Tên phòng' }).fill('Bàn kiểm thử');
  await page.getByRole('dialog').locator('select[name="max"]').selectOption('2');
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await page.getByRole('heading', { name: 'Bàn kiểm thử' }).waitFor();
  await page.getByRole('textbox', { name: 'Tin nhắn' }).fill('Chào cả bàn!');
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click();
  await page.getByText('Chào cả bàn!', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Bắt đầu ván bài' }).click();
  assert.equal(await page.locator('.hand-cards .playing-card').count(), 13);
  await page.screenshot({ path: 'test-results/game-desktop.png', fullPage: true });
  // Shorten AI delays while completing a real game through its UI controls.
  let finished = false;
  for (let i = 0; i < 160; i++) {
    if (await page.locator('.result-content').count()) { finished = true; break; }
    const hint = page.getByRole('button', { name: 'Gợi ý', exact: true });
    if (await hint.isEnabled()) {
      await hint.click();
      const play = page.getByRole('button', { name: /^Đánh bài/ });
      if (await play.isEnabled()) await play.click();
      else await page.getByRole('button', { name: 'Bỏ lượt', exact: true }).click();
    }
    await page.clock.runFor(1600);
  }
  assert.ok(finished, 'Game should finish through UI');
  await page.screenshot({ path: 'test-results/result.png', fullPage: true });
  await page.getByRole('dialog').getByRole('button', { name: 'Về sảnh chờ' }).click();
  await page.getByRole('button', { name: 'Lịch sử đấu' }).click();
  assert.equal(await page.locator('.history-list article').count(), 1);
  await page.reload();
  await page.getByRole('button', { name: 'Lịch sử đấu' }).click();
  assert.equal(await page.locator('.history-list article').count(), 1);
  await page.getByRole('button', { name: 'Sảnh chờ' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/lobby-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow on mobile');
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await page.getByRole('button', { name: /^Luật chơi/ }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sảnh chờ' }).click();
  await page.getByRole('button', { name: 'Chơi ngay', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván bài' }).click();
  await page.screenshot({ path: 'test-results/game-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No game overflow on mobile');
  assert.deepEqual(errors, []);
  console.log('PASS: lobby filters, invalid room code, create room, chat, full game, result, persistent history, mobile layout and rules. No browser errors.');
} finally { await browser.close(); }
