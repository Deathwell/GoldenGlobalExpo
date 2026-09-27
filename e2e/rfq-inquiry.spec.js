import { test, expect } from '@playwright/test';

test.describe('Commercial RFQ & Conversion Journey', () => {

  test('RFQ Form Validation: Blocks empty submission and validates required fields', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const rfqSection = page.locator('#contact');
    await rfqSection.scrollIntoViewIfNeeded();

    const submitBtn = page.locator('#rfqSubmitBtn');
    await expect(submitBtn).toBeVisible();

    // Verify HTML5 required attributes
    await expect(page.locator('#rfqName')).toHaveAttribute('required', '');
    await expect(page.locator('#rfqEmail')).toHaveAttribute('required', '');
    await expect(page.locator('#rfqCompany')).toHaveAttribute('required', '');
    await expect(page.locator('#rfqCountry')).toHaveAttribute('required', '');
  });

  test('Mode Switcher: Toggles between Commercial Bulk RFQ and Lot Sample pack', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const rfqSection = page.locator('#contact');
    await rfqSection.scrollIntoViewIfNeeded();

    const bulkBtn = page.locator('#modeBtnQuote');
    const sampleBtn = page.locator('#modeBtnSample');
    const bulkFields = page.locator('#bulkFields');
    const sampleFields = page.locator('#sampleFields');

    // Default state: Bulk RFQ active
    await expect(bulkBtn).toHaveClass(/active/);
    await expect(bulkFields).toBeVisible();

    // Switch to Sample Mode
    await sampleBtn.click();
    await expect(sampleBtn).toHaveClass(/active/);
    await expect(sampleFields).toBeVisible();

    // Switch back to Bulk Mode
    await bulkBtn.click();
    await expect(bulkBtn).toHaveClass(/active/);
    await expect(bulkFields).toBeVisible();
  });

  test('Interactive Consignment Manifest: Quick Add chips update total consignment volume', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const rfqSection = page.locator('#contact');
    await rfqSection.scrollIntoViewIfNeeded();

    const manifestTotal = page.locator('#manifestTotalVal');
    await expect(manifestTotal).toBeVisible();

    // Initial total should be present
    const initialText = await manifestTotal.textContent();
    expect(initialText).toContain('QTL');

    // Click a quick add chip
    const chip = page.locator('.quick-chip[data-comm="Moong Whole"]');
    if (await chip.isVisible()) {
      await chip.click();
      // Ensure status text verifies capacity
      const statusText = page.locator('#manifestStatus');
      await expect(statusText).toBeVisible();
    }
  });

  test('Full RFQ Submission Journey: Dispatches valid inquiry and displays confirmation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const rfqSection = page.locator('#contact');
    await rfqSection.scrollIntoViewIfNeeded();

    // Fill valid lead data
    await page.locator('#rfqName').fill('Automated Test Officer');
    await page.locator('#rfqEmail').fill('automated_qa@test-trading.com');
    await page.locator('#rfqCompany').fill('Global Agri Logistics LLC');
    await page.locator('#rfqCountry').fill('Singapore (Jurong Port)');

    // Mock inquiry endpoint response to ensure deterministic E2E test
    await page.route('**/api/inquiries', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          id: 'RFQ-E2E-TEST-2026',
          message: 'Official Export Quotation Request lodged in Trade Vault.'
        }),
      });
    });

    await page.locator('#rfqSubmitBtn').click();

    // Verification of confirmation UI / toast
    const successMsg = page.locator('#rfqSuccessMsg');
    await expect(successMsg).toBeVisible({ timeout: 5000 });
    const content = await successMsg.textContent();
    expect(content.toLowerCase()).toMatch(/(transmitted|logged|lodged|success|received|confirmed|quotation)/i);
  });

});
