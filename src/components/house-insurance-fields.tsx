import { useId, type ComponentProps } from "react";
import { formatNzdAmountOnBlur } from "@/domain/nzd";

type Help = { label: string; message: string };
type FieldProps = ComponentProps<"input"> & { label: string; error?: string; help?: Help };

function FieldHelp({ id, field, help }: { id: string; field: string; help: Help }) {
  return (
    <details className="mt-1 text-sm text-muted">
      <summary className="min-h-9 cursor-pointer py-2 text-green underline underline-offset-3" aria-label={`${help.label} ${field}`}>{help.label}</summary>
      <p id={id} className="pb-2 leading-6">{help.message}</p>
    </details>
  );
}

export function HouseField({ label, error, help, ...props }: FieldProps) {
  const id = useId();
  const description = [error && `${id}-error`, help && `${id}-help`].filter(Boolean).join(" ");
  return (
    <div className="min-w-0">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} autoComplete="off" spellCheck={false} maxLength={200} className="analysis-input"
        aria-invalid={error ? true : undefined} aria-describedby={description || undefined} {...props} />
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
      {help && <FieldHelp id={`${id}-help`} field={label} help={help} />}
    </div>
  );
}

export function HouseMoneyField({ locale, value, update, ...props }: Pick<FieldProps, "label" | "error" | "help"> & {
  locale: string; value: string; update: (value: string) => void;
}) {
  return <HouseField {...props} value={value} inputMode="decimal" maxLength={20}
    onChange={(event) => update(event.target.value)}
    onBlur={(event) => update(formatNzdAmountOnBlur(event.target.value, locale))} />;
}

export function HouseSelect<T extends string>({ label, options, value, onChange, empty }: {
  label: string; options: Record<T, string>; value?: T | ""; onChange?: (value: T | "") => void; empty?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label className="field-label" htmlFor={id}>{label}</label>
      <select id={id} className="analysis-input"
        value={value} onChange={onChange && ((event) => onChange(event.target.value as T | ""))}>
        {empty && <option value="">{empty}</option>}
        {(Object.keys(options) as T[]).map((key) => <option key={key} value={key}>{options[key]}</option>)}
      </select>
    </div>
  );
}
