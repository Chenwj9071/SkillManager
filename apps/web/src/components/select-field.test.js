import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectField } from './select-field';
describe('SelectField', () => {
    it('opens a custom option list and applies the selected value', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(_jsx(SelectField, { id: "tool-filter", value: "claude", options: [
                { value: 'claude', label: 'Claude' },
                { value: 'codex', label: 'Codex' }
            ], onChange: handleChange }));
        await user.click(screen.getByRole('button', { name: 'Claude' }));
        await user.click(screen.getByRole('option', { name: 'Codex' }));
        expect(handleChange).toHaveBeenCalledWith('codex');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
});
