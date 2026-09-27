import { test, expect } from '@playwright/test';

test.describe('Consignment & Maritime Tracking Journey', () => {

  test('Consignment Lookup: Search by active B/L code renders telemetry and progression', async ({ page }) => {
    await page.goto('/tracking.html');

    const trackInput = page.locator('#trackInput');
    await expect(trackInput).toBeVisible();

    // Query active demo shipment
    await trackInput.fill('GGE-JNPT-2026');
    await page.locator('button.search-capsule-btn').click();

    // Verify result card becomes visible
    const resultCard = page.locator('#resultCard');
    await expect(resultCard).toBeVisible({ timeout: 5000 });

    // Assert consignment details
    await expect(page.locator('#rBlCode')).toContainText('GGE-JNPT-2026');
    await expect(page.locator('#rStatusText')).toBeVisible();

    // Verify Stepper progression is present
    const stepper = page.locator('#stepper');
    await expect(stepper).toBeVisible();
  });

  test('Quick Reference Chips: Populates B/L and initiates lookup immediately', async ({ page }) => {
    await page.goto('/tracking.html');

    const quickBtn = page.locator('.quick-ref-btn', { hasText: 'GGE-RTM-8821' });
    await expect(quickBtn).toBeVisible();
    await quickBtn.click();

    // Input should be populated with selected code
    await expect(page.locator('#trackInput')).toHaveValue('GGE-RTM-8821');

    // Result card displays Rotterdam shipment
    const resultCard = page.locator('#resultCard');
    await expect(resultCard).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#rBlCode')).toContainText('GGE-RTM-8821');
  });

  test('Enterprise PII Privacy Shield: Contact info redacted for anonymous tracking visitor', async ({ page }) => {
    await page.goto('/tracking.html');

    await page.locator('#trackInput').fill('GGE-JNPT-2026');
    await page.locator('button.search-capsule-btn').click();

    await expect(page.locator('#resultCard')).toBeVisible({ timeout: 5000 });

    // Buyer phone number or private email must not be exposed in the page body
    const pageContent = await page.content();
    expect(pageContent).not.toContain('tariq@private-buyer.ae');
    expect(pageContent).not.toContain('+971-50-1234567');
  });

  test('Invalid B/L Tracking: Non-existent identifier displays friendly not-found banner', async ({ page }) => {
    await page.goto('/tracking.html');

    await page.locator('#trackInput').fill('NON-EXISTENT-BL-CODE-9999');
    await page.locator('button.search-capsule-btn').click();

    // Verify not found message / error state handled cleanly without console exceptions
    const notFoundEl = page.locator('.not-found-card, #notFoundState, #resultCard');
    await expect(notFoundEl.first()).toBeVisible({ timeout: 5000 });
    await expect(notFoundEl.first()).toContainText(/No Active Consignment Found/i);
  });

});
