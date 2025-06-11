import { expect, test } from 'bun:test';

test('basic test setup', () => {
  expect(1 + 1).toBe(2);
});

test('project structure', () => {
  expect(typeof process.env.NODE_ENV).toBe('string');
});
