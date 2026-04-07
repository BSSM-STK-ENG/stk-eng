import { Search, X } from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';

type AdminSearchFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
  inputClassName?: string;
};

export default function AdminSearchField({
  value,
  onChange,
  placeholder,
  wrapperClassName = '',
  inputClassName = '',
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: AdminSearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;

  return (
    <div className={`admin-search-field ${wrapperClassName}`.trim()}>
      <Search size={16} aria-hidden="true" className="admin-search-icon" />
      <input
        {...rest}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasValue) {
            onChange('');
          }
          onKeyDown?.(event);
        }}
        placeholder={placeholder}
        className={`admin-control admin-search-input pl-10 pr-10 ${inputClassName}`.trim()}
      />
      {hasValue ? (
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={(event) => {
            event.preventDefault();
            onChange('');
            inputRef.current?.focus();
          }}
          className="admin-search-clear chat-focus-ring"
          aria-label="검색어 지우기"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
