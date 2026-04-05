import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('web smoke', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('imports the app component', () => {
    expect(App).toBeTypeOf('function');
  });
});
