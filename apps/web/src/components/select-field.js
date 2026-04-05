import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState } from 'react';
export function SelectField({ id, value, options, onChange, disabled = false }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const listboxId = useId();
    const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? options[0] ?? null, [options, value]);
    useEffect(() => {
        if (!open) {
            return;
        }
        function handlePointerDown(event) {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        }
        function handleEscape(event) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);
    return (_jsxs("div", { ref: rootRef, className: `select-field ${open ? 'open' : ''}`, children: [_jsxs("button", { id: id, type: "button", className: "select-trigger", "aria-haspopup": "listbox", "aria-expanded": open, "aria-controls": listboxId, disabled: disabled, onClick: () => {
                    if (!disabled) {
                        setOpen((current) => !current);
                    }
                }, children: [_jsx("span", { className: "select-value", children: selectedOption?.label ?? '' }), _jsx("span", { className: "select-chevron", "aria-hidden": "true", children: "v" })] }), open ? (_jsx("div", { id: listboxId, className: "select-panel", role: "listbox", "aria-labelledby": id, children: options.map((option) => (_jsxs("button", { type: "button", role: "option", "aria-selected": option.value === value, className: `select-option ${option.value === value ? 'active' : ''}`, onClick: () => {
                        onChange(option.value);
                        setOpen(false);
                    }, children: [_jsx("span", { children: option.label }), option.description ? (_jsx("span", { className: "select-option-description", children: option.description })) : null] }, option.value))) })) : null] }));
}
