import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport Assertions & Responsive Ergonomics', () => {

  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test('Homepage Mobile Layout: Zero horizontal overflow on mobile viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Assert that the page does not horizontally scroll
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(isOverflowing).toBe(false);

    // Verify brand logo and mobile navigation trigger
    const brand = page.locator('.brand, .logo-text, .brand-title').first();
    await expect(brand).toBeVisible();
  });

  test('Mobile Hamburger Navigation: Toggles menu and drawer properly', async ({ page }) => {
    await page.goto('/');

    const navToggle = page.locator('#navToggle, .nav-toggle').first();
    if (await navToggle.isVisible()) {
      await navToggle.click();
      const mobileMenu = page.locator('#mobileMenu, .mobile-menu').first();
      await expect(mobileMenu).toBeVisible();
      await expect(mobileMenu).toHaveClass(/open/);
    }
  });

  test('Tracking Portal Mobile Layout: Search capsule stacks properly and cards adapt', async ({ page }) => {
    await page.goto('/tracking.html');
    await page.waitForLoadState('domcontentloaded');

    // Verify search capsule input is visible and full-width on mobile
    const searchInput = page.locator('#trackInput');
    await expect(searchInput).toBeVisible();

    const box = await searchInput.boundingBox();
    expect(box).not.toBeNull();
    // In mobile viewport (375px), input width should be well-adapted (>= 200px)
    expect(box.width).toBeGreaterThanOrEqual(200);

    // No horizontal scroll on tracking page
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(isOverflowing).toBe(false);
  });

  test('Login Portal Mobile Layout: Card paddings and touch targets are ergonomic', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('domcontentloaded');

    const loginCard = page.locator('.login-card');
    await expect(loginCard).toBeVisible();

    // Verify input height is touch-friendly (at least 40px for WCAG 2.1 touch target guideline)
    const emailBox = await page.locator('#loginEmail').boundingBox();
    expect(emailBox.height).toBeGreaterThanOrEqual(40);

    const btnBox = await page.locator('#submitBtnStep1').boundingBox();
    expect(btnBox.height).toBeGreaterThanOrEqual(40);
  });

});
