import { useState, type ReactNode } from "react";
import { Icon, type IconSize } from "../components/Icon";

// Port of the vanilla heading() helper.
export function Heading({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}

// Port of the vanilla stat() helper.
export function Stat({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: ReactNode;
  change: string;
  icon: string;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon name={icon} size="sm" />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        <span className={change.indexOf("+") === 0 ? "positive" : ""}>{change}</span>
      </div>
    </div>
  );
}

// The inline brand mark svg used in the admin sidebar.
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" width={27} height={27} aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="9" fill="#557b5d" />
        <path
          d="M16 6.7v18.6M6.7 16h18.6M9.4 9.4l13.2 13.2M22.6 9.4 9.4 22.6"
          stroke="#fffefa"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

// Port of the vanilla select() popover.
export function Select({
  label,
  options,
  onChange,
  ariaLabel,
}: {
  label: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="select-wrap">
      <button
        className="select-button"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
        <Icon name="chevron" size="sm" />
      </button>
      {open ? (
        <div className="select-popover" role="listbox" aria-label={ariaLabel}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={label === o}
              className={o === label ? "active" : ""}
              onClick={() => {
                setOpen(false);
                onChange(o);
              }}
            >
              {o === label ? <Icon name="check" size="sm" /> : null}
              {o}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Port of the vanilla field() helper for modal forms.
export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = true,
  min,
  pattern,
  placeholder,
  autoFocus,
  textarea,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
  pattern?: string;
  placeholder?: string;
  autoFocus?: boolean;
  textarea?: boolean;
  disabled?: boolean;
}) {
  const id = "f-" + name;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {textarea ? (
        <textarea
          id={id}
          name={name}
          value={value}
          required={required}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          required={required}
          min={min}
          pattern={pattern}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export type { IconSize };
