import { describe, expect, it } from 'vitest';
import { availabilityModeSchema, toolTypeSchema } from './domain';

describe('domain schemas', () => {
  it('accepts supported tool types and availability modes', () => {
    expect(toolTypeSchema.parse('claude')).toBe('claude');
    expect(toolTypeSchema.parse('cursor')).toBe('cursor');
    expect(availabilityModeSchema.parse('manual_only')).toBe('manual_only');
  });
});
