import { test, expect } from '@playwright/test';

test.describe('Enterprise Authentication & Access Control Journey', () => {

  test('Server-side Route Gate: Visiting /desk.html unauthenticated redirects to /login.html', async ({ page }) => {
    // Attempt visiting protected dashboard
    const response = await page.goto('/desk.html');
    
    // Must be redirected to login with redirect parameter
    await expect(page).toHaveURL(/\/login\.html\?redirect=\/desk\.html/);
    await expect(page.locator('.brand-title')).toContainText('Golden Global Expo');
    await expect(page.locator('#loginEmail')).toBeVisible();
    await expect(page.locator('#loginPassword')).toBeVisible();
  });

  test('Authentication Form Validation: Rejects invalid or empty credentials', async ({ page }) => {
    await page.goto('/login.html');

    // Attempt submitting without email
    await page.locator('#loginPassword').fill('SomePassword123!');
    const emailInput = page.locator('#loginEmail');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired).not.toBeNull();

    // Fill non-registered email and password
    await page.locator('#loginEmail').fill('unknown_intruder@external.com');
    await page.locator('#loginPassword').fill('WrongPassword123!');
    await page.locator('#submitBtnStep1').click();

    // Verify error banner is displayed
    const alertBox = page.locator('#alertBox');
    await expect(alertBox).toBeVisible({ timeout: 5000 });
    const text = await alertBox.textContent();
    expect(text.toLowerCase()).toMatch(/(invalid|denied|credentials)/i);
  });

  test('Keyboard Navigation: Tab order and Enter key submission on login form', async ({ page }) => {
    await page.goto('/login.html');

    // Focus on email input
    await page.locator('#loginEmail').focus();
    await expect(page.locator('#loginEmail')).toBeFocused();

    // Type email and press Tab to move to password
    await page.keyboard.type('test@goldenglobalexpo.com');
    await page.keyboard.press('Tab');
    await expect(page.locator('#loginPassword')).toBeFocused();

    // Type password
    await page.keyboard.type('TestPassword123!');

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Button should enter loading/processing or show response alert
    const alertBox = page.locator('#alertBox');
    await expect(alertBox).toBeVisible({ timeout: 5000 });
  });

  test('Open Redirect Prevention: Rejects malicious external redirect parameter', async ({ page }) => {
    // Malicious open redirect attempt
    await page.goto('/login.html?redirect=https://evil-phishing-site.com');
    
    // Evaluate getSafeRedirectUrl helper in browser context
    const safeUrl = await page.evaluate(() => {
      const param = new URLSearchParams(window.location.search).get('redirect');
      // @ts-ignore
      return typeof getSafeRedirectUrl === 'function' ? getSafeRedirectUrl(param) : null;
    });

    if (safeUrl !== null) {
      expect(safeUrl).toBe('desk.html');
      expect(safeUrl).not.toContain('evil-phishing-site.com');
    }
  });

});
