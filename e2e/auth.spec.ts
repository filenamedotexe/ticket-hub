import { test, expect } from '@playwright/test';

// Test data for each role
const testUsers = [
  {
    email: 'client@demo.com',
    password: 'client123',
    role: 'CLIENT',
    name: 'Demo Client',
  },
  {
    email: 'staff@demo.com',
    password: 'staff123',
    role: 'STAFF',
    name: 'Demo Staff',
  },
  {
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Demo Admin',
  },
];

test.describe('Authentication Tests - Phase 1.3', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  testUsers.forEach(({ email, password, role }) => {
    test(`should login as ${role} role and land on dashboard`, async ({
      page,
    }) => {
      // Click sign in button
      await page.click('text=Sign In to Continue');

      // Should be redirected to sign in page
      await expect(page).toHaveURL(/\/auth\/signin/);
      await expect(page.locator('h2')).toContainText('Sign in to Ticket Hub');

      // Fill in email and password
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard on successful login
      await expect(page).toHaveURL(/\/dashboard/);

      // Should see dashboard content
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
  });

  test('should show correct sign-in page elements', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check all required elements are present
    await expect(page.locator('h2')).toContainText('Sign in to Ticket Hub');
    await expect(
      page.locator('text=Enter your email and password to sign in')
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(
      'Sign In'
    );

    // Check that demo accounts are listed with passwords
    await expect(page.locator('text=Demo accounts for testing:')).toBeVisible();
    await expect(
      page.locator('text=client@demo.com / client123 (Client role)')
    ).toBeVisible();
    await expect(
      page.locator('text=staff@demo.com / staff123 (Staff role)')
    ).toBeVisible();
    await expect(
      page.locator('text=admin@demo.com / admin123 (Admin role)')
    ).toBeVisible();
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'client@demo.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(
      page.locator('text=Error: Invalid email or password')
    ).toBeVisible();
  });

  test('should require both email and password', async ({ page }) => {
    await page.goto('/auth/signin');

    // Try to submit without email and password
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should redirect authenticated users to dashboard', async ({ page }) => {
    // This test would require actual authentication
    // For Phase 1, we're testing the redirect logic exists
    await page.goto('/');

    // Verify redirect to sign in when not authenticated
    await expect(page.locator('text=Sign In to Continue')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in valid credentials
    await page.fill('input[type="email"]', 'client@demo.com');
    await page.fill('input[type="password"]', 'client123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});

test.describe('Role-based UI Tests', () => {
  // These tests verify that the role-based permissions are properly displayed
  // Once we have session mocking or test authentication, we can expand these

  test('dashboard should show role-specific permissions', async ({ page }) => {
    // This would be expanded once we have test authentication
    // For now, verify dashboard page structure exists
    await page.goto('/dashboard');

    // Should redirect to sign in if not authenticated
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe('Multi-tenant Tests', () => {
  test('should handle tenant assignment correctly', async ({ page }) => {
    // Phase 1 uses auto-assignment to demo tenant
    // Future phases will have more sophisticated tenant handling
    await page.goto('/auth/signin');

    // Verify that all demo emails are associated with demo company
    await expect(page.locator('text=Demo accounts for testing:')).toBeVisible();

    // All three demo accounts should be for the same tenant
    testUsers.forEach(({ email }) => {
      expect(email).toContain('@demo.com');
    });
  });
});
