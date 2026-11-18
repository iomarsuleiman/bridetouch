import { isTouch } from "../hooks/useScrollLock";
import { useEffect, useState, type ReactNode } from "react";
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

/** Form field for dashboard dialogs. Picks the right mobile keyboard for each
 *  type and never autofocuses on touch screens (that would pop the keyboard
 *  open and shove the dialog around). */
export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = true,
  min,
  max,
  step,
  pattern,
  placeholder,
  autoFocus,
  textarea,
  disabled,
  hint,
  maxLength,
  autoComplete = "off",
  uppercase,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | "any";
  pattern?: string;
  placeholder?: string;
  autoFocus?: boolean;
  textarea?: boolean;
  disabled?: boolean;
  hint?: string;
  maxLength?: number;
  autoComplete?: string;
  uppercase?: boolean;
}) {
  const id = "f-" + name;
  const hintId = hint ? id + "-hint" : undefined;
  const focus = autoFocus && !isTouch();
  const numeric = type === "number";
  const keyboard: Partial<Record<string, "decimal" | "numeric" | "tel" | "email" | "url">> = { number: step === 1 ? "numeric" : "decimal", tel: "tel", email: "email", url: "url" };
  const plain = type === "email" || type === "url" || uppercase;
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required ? null : <span className="muted"> (optional)</span>}</label>
      {textarea ? (
        <textarea
          id={id}
          name={name}
          value={value}
          required={required}
          autoFocus={focus}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-describedby={hintId}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          name={name}
          // Numbers use a text field with a numeric keyboard: iOS number inputs
          // allow letters, and the wheel changes values by accident on desktop.
          type={numeric ? "text" : type}
          inputMode={keyboard[type]}
          value={value}
          required={required}
          min={numeric ? undefined : min}
          pattern={numeric ? (step === 1 ? "[0-9]*" : "[0-9]*[.,]?[0-9]*") : pattern}
          placeholder={placeholder}
          autoFocus={focus}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoCapitalize={plain ? "none" : undefined}
          autoCorrect={plain || numeric ? "off" : undefined}
          spellCheck={plain || numeric ? false : undefined}
          enterKeyHint="done"
          aria-describedby={hintId}
          data-min={min}
          data-max={max}
          style={uppercase ? { textTransform: "uppercase" } : undefined}
          onChange={(e) => onChange(numeric ? e.target.value.replace(",", ".").replace(/[^0-9.]/g, "") : e.target.value)}
        />
      )}
      {hint ? <small id={hintId} className="field-hint">{hint}</small> : null}
    </div>
  );
}

/** Parses a numeric Field value; returns NaN when empty or out of range. */
export function numberIn(value: string, min = -Infinity, max = Infinity) {
  if (!value.trim()) return NaN;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
}

export type { IconSize };

/** Two-tap delete: the first tap arms it ("Tap again to delete"), the second
 *  deletes. Disarms itself after a few seconds. Avoids browser confirm()
 *  dialogs, which are clumsy on phones. */
export function DeleteButton({ label = "Delete", onDelete, small = true }: { label?: string; onDelete: () => Promise<unknown>; small?: boolean }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={"btn ghost" + (small ? " small" : "") + (armed ? " danger" : " danger-text")}
      disabled={busy}
      aria-live="polite"
      onClick={async () => {
        if (!armed) return setArmed(true);
        setBusy(true);
        try {
          await onDelete();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
    >
      {busy ? "Deleting…" : armed ? "Tap again to delete" : <><Icon name="trash" size="sm" /> {label}</>}
    </button>
  );
}
