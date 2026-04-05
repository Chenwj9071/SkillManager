import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectFieldProps {
  id: string;
  value: string;
  options: SelectOption[];
  onChange(value: string): void;
  disabled?: boolean;
}

export function SelectField({ id, value, options, onChange, disabled = false }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0] ?? null,
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
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

  return (
    <div ref={rootRef} className={`select-field ${open ? 'open' : ''}`}>
      <button
        id={id}
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
      >
        <span className="select-value">{selectedOption?.label ?? ''}</span>
        <span className="select-chevron" aria-hidden="true">
          v
        </span>
      </button>
      {open ? (
        <div id={listboxId} className="select-panel" role="listbox" aria-labelledby={id}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`select-option ${option.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.description ? (
                <span className="select-option-description">{option.description}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
