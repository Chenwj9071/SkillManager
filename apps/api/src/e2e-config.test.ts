import { describe, expect, it } from 'vitest';
import playwrightConfig from '../../../playwright.config';

describe('playwright e2e config', () => {
  it('uses the production-like server base url without relying on playwright webServer', () => {
    expect(playwrightConfig.use?.baseURL).toBe('http://127.0.0.1:3001');
    expect(playwrightConfig.webServer).toBeUndefined();
  });
});
