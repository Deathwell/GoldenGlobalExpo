import { test, expect } from '@playwright/test';

test.describe('Network Resilience & Downstream Fault Handling Journey', () => {

  test('500 Error Intercept on Commodity Pricing: UI handles degraded API gracefully', async ({ page }) => {
    // Intercept /api/prices to return HTTP 500 Internal Server Error
    await page.route('**/api/prices', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Simulated Upstream Forex Rate Provider Outage',
          detail: 'Internal Server Error'
        }),
      });
    });

    // Capture console errors
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Ensure the page rendered without catastrophic white-screen crash
    await expect(page.locator('.brand, .hero, .logo-text, .brand-title').first()).toBeVisible();

    // Verify critical uncaught errors did not crash page lifecycle
    expect(errors.filter(e => e.includes('Uncaught (in promise) TypeError: Cannot read properties of undefined'))).toHaveLength(0);
  });

  test('500 Error Intercept on Consignment Tracking: Displays clear system recovery toast', async ({ page }) => {
    await page.goto('/tracking.html');

    // Intercept tracking endpoint with simulated 500 crash
    await page.route('**/api/track*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'An internal server error occurred. Please contact the Trade Desk administrator.',
          detail: 'Database connectivity timeout'
        }),
      });
    });

    await page.locator('#trackInput').fill('GGE-JNPT-2026');
    await page.locator('button.search-capsule-btn').click();

    // Verify user receives error notification or alert
    await page.waitForTimeout(1000);
    const hasErrorFeedback = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('error') || text.includes('failed') || text.includes('unavailable') || text.includes('try again');
    });
    expect(hasErrorFeedback).toBe(true);
  });

  test('503 Service Unavailable Intercept on RFQ Inquiries: Handled without form loss', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const rfqSection = page.locator('#contact');
    await rfqSection.scrollIntoViewIfNeeded();

    // Intercept inquiry endpoint with HTTP 503 Maintenance / Circuit Breaker Trip
    await page.route('**/api/inquiries', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Trade Vault is currently performing transactional backup. Please retry in 30 seconds.',
        }),
      });
    });

    await page.locator('#rfqName').fill('Resilience Probe Tester');
    await page.locator('#rfqEmail').fill('tester@resilience.org');
    await page.locator('#rfqCompany').fill('Chaos Testing Org');
    await page.locator('#rfqCountry').fill('Singapore');

    await page.locator('#rfqSubmitBtn').click();

    // Ensure the input values are preserved so user does not lose their data
    await expect(page.locator('#rfqName')).toHaveValue('Resilience Probe Tester');
    await expect(page.locator('#rfqEmail')).toHaveValue('tester@resilience.org');
  });

  test('Complete Network Disconnect / Abort: Graceful offline handling', async ({ page }) => {
    // Abort all dynamic API requests to simulate complete network drop
    await page.route('**/api/**', (route) => route.abort('failed'));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Page static assets and luxury layout must still be intact
    const heroTitle = page.locator('h1, .hero-title, .brand-title').first();
    await expect(heroTitle).toBeVisible();
  });

});
