import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesPath = join(__dirname, 'styles.css');

describe('toast styles', () => {
  it('positions toasts near the top center and uses a light gray background', () => {
    const css = readFileSync(stylesPath, 'utf8');

    expect(css).toContain('.toast-stack {');
    expect(css).toContain('top: 24px;');
    expect(css).toContain('left: 50%;');
    expect(css).toContain('transform: translateX(-50%);');

    expect(css).toContain('.toast {');
    expect(css).toContain('color: #24312b;');
    expect(css).toContain('background: #eef1ef;');
  });
});
