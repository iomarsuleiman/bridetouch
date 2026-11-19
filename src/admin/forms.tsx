import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { friendlyError } from "../lib/format";

/** One consistent save model for every settings screen: edit freely, then
 *  "Save changes" in the bar that appears. Leaving with unsaved changes warns. */
export function useSettingsDraft<T extends Record<string, unknown>>(initial: () => T, toPatch: (draft: T) => Record<string, unknown> | string) {
  const update = useMutation(api.settings.update);
  const toast = useToast();
  const [draft, setDraft] = useState<T>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof T>(key: K, value: T[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const patch = (next: Partial<T>) => {
    setDraft((current) => ({ ...current, ...next }));
    setDirty(true);
  };

  async function save() {
    if (saving) return;
    const result = toPatch(draft);
    if (typeof result === "string") {
      toast(result);
      return;
    }
    setSaving(true);
    try {
      await update(result);
      setDirty(false);
      toast("Saved");
    } catch (error) {
      toast(friendlyError(error, "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  }
  function discard() {
    setDraft(initial());
    setDirty(false);
  }
  return { draft, set, patch, dirty, saving, save, discard };
}

export function SaveBar({ dirty, saving, onSave, onDiscard }: { dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty) return null;
  // Rendered into <body>: page-enter animations use transforms, which would
  // otherwise pin this "fixed" bar to the page instead of the screen.
  return createPortal(
    <div className="savebar" role="status">
      <span className="savebar-dot" aria-hidden="true" />
      <span className="savebar-text">Unsaved changes</span>
      <button type="button" className="btn ghost small" onClick={onDiscard} disabled={saving}>
        Discard
      </button>
      <button type="button" className="btn primary small" onClick={onSave} disabled={saving}>
        {saving ? <><span className="spinner" aria-hidden="true" /> Saving…</> : "Save changes"}
      </button>
    </div>,
    document.body,
  );
}

export function Section({ icon, title, description, children, actions }: { icon: string; title: string; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="section-card">
      <header className="section-head">
        <span className="section-icon"><Icon name={icon} size="sm" /></span>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <div className="toggle-row">
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={"toggle" + (checked ? " on" : "")} onClick={() => onChange(!checked)}>
        <i />
      </button>
    </div>
  );
}

export function TextField({
  id, label, value, onChange, hint, placeholder, type = "text", multiline, maxLength = 200, inputMode, required,
}: {
  id: string; label: string; value: string; onChange: (value: string) => void; hint?: ReactNode; placeholder?: string;
  type?: string; multiline?: boolean; maxLength?: number; inputMode?: "text" | "email" | "tel" | "url" | "decimal" | "numeric"; required?: boolean;
}) {
  const plain = inputMode === "email" || inputMode === "url" || type === "email";
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required ? null : <span className="muted"> (optional)</span>}</label>
      {multiline ? (
        <textarea id={id} rows={3} maxLength={maxLength} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize={plain ? "none" : undefined}
          autoCorrect={plain ? "off" : undefined}
          spellCheck={plain ? false : undefined}
          onChange={(e) => onChange(inputMode === "decimal" || inputMode === "numeric" ? e.target.value.replace(",", ".").replace(/[^0-9.]/g, "") : e.target.value)}
        />
      )}
      {hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  );
}

/** "instagram.com/shop" → "https://instagram.com/shop"; mailto:/tel: untouched. */
export function withScheme(value: string) {
  const v = value.trim();
  if (!v || /^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "mailto:" + v;
  return "https://" + v.replace(/^\/+/, "");
}
