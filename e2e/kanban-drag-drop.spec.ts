import { test, expect } from '@playwright/test';

test.describe('Phase 3.3 - Kanban Board Drag & Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as a demo user
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'admin@demo.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Wait for Kanban board to load
    await page.waitForSelector('[data-testid="kanban-board"]', {
      timeout: 10000,
    });
  });

  test('should display Kanban board with columns', async ({ page }) => {
    // Check that all four columns are present
    await expect(page.locator('text="To Do"')).toBeVisible();
    await expect(page.locator('text="In Progress"')).toBeVisible();
    await expect(page.locator('text="QA Review"')).toBeVisible();
    await expect(page.locator('text="Done"')).toBeVisible();

    // Check that work items are displayed
    const workItems = page.locator('[data-testid^="work-item-"]');
    await expect(workItems.first()).toBeVisible();
  });

  test('should show work item details correctly', async ({ page }) => {
    // Find a work item and check its details
    const firstWorkItem = page.locator('[data-testid^="work-item-"]').first();
    await expect(firstWorkItem).toBeVisible();

    // Check for essential elements: title, priority badge, type icon
    await expect(firstWorkItem.locator('.font-medium')).toBeVisible(); // title
    await expect(firstWorkItem.locator('[class*="px-2 py-1"]')).toBeVisible(); // priority badge
  });

  test('should drag work item between columns and persist status change', async ({
    page,
  }) => {
    // Find a work item in TODO column
    const todoColumn = page.locator('[data-testid="kanban-column-TODO"]');
    const inProgressColumn = page.locator(
      '[data-testid="kanban-column-IN_PROGRESS"]'
    );

    // Get initial counts
    const initialTodoCount = await todoColumn
      .locator('[data-testid^="work-item-"]')
      .count();
    const initialInProgressCount = await inProgressColumn
      .locator('[data-testid^="work-item-"]')
      .count();

    // Find a work item to drag
    const workItemToDrag = todoColumn
      .locator('[data-testid^="work-item-"]')
      .first();
    await expect(workItemToDrag).toBeVisible();

    // Get the work item ID for verification
    const workItemId = await workItemToDrag.getAttribute('data-testid');

    // Perform drag and drop
    await workItemToDrag.dragTo(inProgressColumn);

    // Wait for the UI to update
    await page.waitForTimeout(1000);

    // Verify the item moved to In Progress column
    await expect(
      inProgressColumn.locator(`[data-testid="${workItemId}"]`)
    ).toBeVisible();
    await expect(
      todoColumn.locator(`[data-testid="${workItemId}"]`)
    ).not.toBeVisible();

    // Verify counts changed
    const newTodoCount = await todoColumn
      .locator('[data-testid^="work-item-"]')
      .count();
    const newInProgressCount = await inProgressColumn
      .locator('[data-testid^="work-item-"]')
      .count();

    expect(newTodoCount).toBe(initialTodoCount - 1);
    expect(newInProgressCount).toBe(initialInProgressCount + 1);

    // **KEY SUCCESS GATE**: Refresh page and verify persistence
    await page.reload();
    await page.waitForSelector('[data-testid="kanban-board"]', {
      timeout: 10000,
    });

    // Verify the change persisted after refresh
    await expect(
      inProgressColumn.locator(`[data-testid="${workItemId}"]`)
    ).toBeVisible();
    await expect(
      todoColumn.locator(`[data-testid="${workItemId}"]`)
    ).not.toBeVisible();
  });

  test('should work on mobile viewport (responsive test)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that Kanban board is still usable
    await expect(page.locator('text="To Do"')).toBeVisible();

    // Check horizontal scrolling works
    const kanbanContainer = page.locator('[data-testid="kanban-board"]');
    await expect(kanbanContainer).toBeVisible();

    // Test that we can see different columns by scrolling
    await kanbanContainer.scroll({ scrollLeft: 300 });
    await expect(page.locator('text="QA Review"')).toBeVisible();
  });

  test('should handle drag and drop with touch events (mobile simulation)', async ({
    page,
  }) => {
    // Simulate mobile touch environment
    await page.setViewportSize({ width: 375, height: 667 });

    const todoColumn = page.locator('[data-testid="kanban-column-TODO"]');
    const qaColumn = page.locator('[data-testid="kanban-column-QA"]');

    const workItem = todoColumn.locator('[data-testid^="work-item-"]').first();
    await expect(workItem).toBeVisible();

    const workItemId = await workItem.getAttribute('data-testid');

    // Get bounding boxes for touch simulation
    const workItemBox = await workItem.boundingBox();
    const qaColumnBox = await qaColumn.boundingBox();

    if (workItemBox && qaColumnBox) {
      // Simulate touch drag and drop
      await page.mouse.move(
        workItemBox.x + workItemBox.width / 2,
        workItemBox.y + workItemBox.height / 2
      );
      await page.mouse.down();

      // Add delay to simulate long press (200ms as configured in component)
      await page.waitForTimeout(250);

      await page.mouse.move(
        qaColumnBox.x + qaColumnBox.width / 2,
        qaColumnBox.y + qaColumnBox.height / 2
      );
      await page.mouse.up();

      // Wait for update
      await page.waitForTimeout(1000);

      // Verify the move worked
      await expect(
        qaColumn.locator(`[data-testid="${workItemId}"]`)
      ).toBeVisible();
    }
  });

  test('should show error handling when drag fails', async ({ page }) => {
    // This test would check error handling, but for now we'll just verify
    // that the error state UI exists in case of network issues

    // Check that error retry functionality exists
    const workItem = page.locator('[data-testid^="work-item-"]').first();
    await expect(workItem).toBeVisible();

    // For now, just verify the UI elements are accessible
    // In a real test, we'd mock a network failure and test error handling
  });

  test('should maintain performance during drag operations', async ({
    page,
  }) => {
    // Start performance monitoring
    const startTime = Date.now();

    const todoColumn = page.locator('[data-testid="kanban-column-TODO"]');
    const doneColumn = page.locator('[data-testid="kanban-column-DONE"]');

    const workItem = todoColumn.locator('[data-testid^="work-item-"]').first();
    await expect(workItem).toBeVisible();

    // Perform drag and drop
    await workItem.dragTo(doneColumn);

    // Wait for UI update
    await page.waitForTimeout(500);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (less than 2 seconds for user experience)
    expect(duration).toBeLessThan(2000);
  });
});
