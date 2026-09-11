import { useEffect, useState, useRef, useId } from "react";
import { Input } from "@/components/ui/input";
import {
  formatZonedDateTimeLocal,
  parseZonedDateTimeLocal,
  formatDateInput,
  formatZonedDateTimeInput,
  parseDateInput,
  parseZonedDateTimeInput,
} from "@/lib/utils";

interface DateTextInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  ariaLabel?: string;
}

export function DateTextInput({
  id,
  value,
  onChange,
  required,
  ariaLabel,
}: DateTextInputProps) {
  const formatted = formatDateInput(value);
  const [draft, setDraft] = useState(formatted);
  useEffect(() => setDraft(formatted), [formatted]);
  const parsed = draft ? parseDateInput(draft) : "";
  const invalid = Boolean(draft && !parsed);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="DD/MM/YYYY"
      pattern="[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}"
      title="Enter a date as DD/MM/YYYY"
      value={draft}
      required={required}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const nextValue = next ? parseDateInput(next) : "";
        event.target.setCustomValidity(next && !nextValue ? "Enter a valid date as DD/MM/YYYY" : "");
        if (nextValue !== null) onChange(nextValue);
      }}
      onBlur={(event) => {
        event.currentTarget.setCustomValidity("");
        setDraft(formatDateInput(value));
      }}
    />
  );
}

interface ZonedDateTimeTextInputProps extends DateTextInputProps {
  timeZone: string;
}

export function ZonedDateTimeTextInput({
  id,
  value,
  onChange,
  required,
  ariaLabel,
  timeZone,
}: ZonedDateTimeTextInputProps) {
  const formatted = formatZonedDateTimeInput(value, timeZone);
  const [draft, setDraft] = useState(formatted);
  useEffect(() => setDraft(formatted), [formatted]);
  const parsed = draft ? parseZonedDateTimeInput(draft, timeZone) : "";
  const invalid = Boolean(draft && !parsed);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="DD/MM/YYYY, HH:mm"
      pattern="[0-9]{1,2}/[0-9]{1,2}/[0-9]{4},? [0-9]{1,2}:[0-9]{2}"
      title="Enter date and time as DD/MM/YYYY, HH:mm using a 24-hour clock"
      value={draft}
      required={required}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const nextValue = next ? parseZonedDateTimeInput(next, timeZone) : "";
        event.target.setCustomValidity(next && !nextValue ? "Enter a valid date and 24-hour time for the selected timezone" : "");
        if (nextValue !== null) onChange(nextValue);
      }}
      onBlur={(event) => {
        event.currentTarget.setCustomValidity("");
        setDraft(formatZonedDateTimeInput(value, timeZone));
      }}
    />
  );
}

/** Browser calendar/time picker, with keyboard entry and explicit-zone conversion. */
export function ZonedDateTimePicker({id, value, onChange, required, ariaLabel, timeZone}: ZonedDateTimeTextInputProps) {
  const formatted = formatZonedDateTimeLocal(value, timeZone);
  const [draft, setDraft] = useState(formatted);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  useEffect(() => {
    setDraft(formatted);
    setInvalid(false);
    inputRef.current?.setCustomValidity('');
  }, [formatted, timeZone]);
  const error = 'This local date or time does not exist in the selected timezone. Choose a valid time.';
  const update = (input: HTMLInputElement) => {
    const next = input.value;
    setDraft(next);
    const parsed = next ? parseZonedDateTimeLocal(next, timeZone) : '';
    const bad = Boolean(next && parsed === null);
    setInvalid(bad);
    input.setCustomValidity(bad ? error : '');
    // Preserve invalid drafts on blur. Never save the previous valid value silently.
    if (parsed !== null) onChange(parsed);
  };
  return <div className="space-y-1">
    <Input ref={inputRef} id={id} type="datetime-local" step={60} value={draft}
      required={required} aria-label={ariaLabel} aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
      onInput={event => update(event.currentTarget)}
      onChange={event => update(event.currentTarget)} />
    {invalid && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
