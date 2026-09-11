import { useLayoutEffect, useRef } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Plus, X } from 'lucide-react';

export function normalizeStringList(values: readonly string[]): string[] {
  return [...new Set(values.flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean))];
}

interface StringListInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

/** Every edit belongs to the parent draft immediately; no unsaved inner input. */
export function StringListInput({ id, label, values, onChange, disabled = false }: StringListInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const addButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<number | 'add' | null>(null);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === 'add') addButton.current?.focus();
    else if (target !== null) inputs.current[target]?.focus();
  }, [values]);

  const addEntry = () => {
    pendingFocus.current = values.length;
    onChange([...values, '']);
  };
  const removeEntry = (index: number) => {
    pendingFocus.current = values.length === 1 ? 'add' : Math.min(index, values.length - 2);
    onChange(values.filter((_, i) => i !== index));
  };

  return <div className="w-full space-y-2" role="group" aria-label={label} aria-describedby={`${id}-help`}>
    <div className="flex flex-wrap gap-2">
      {values.map((value, index) => <div key={index} className="flex max-w-full items-center gap-1 rounded-md border bg-muted/20 p-1">
        <Input
          id={index === 0 ? id : `${id}-${index}`}
          ref={element => { inputs.current[index] = element; }}
          aria-label={`${label} ${index + 1}`}
          value={value}
          disabled={disabled}
          className="h-7 w-32 border-0 bg-transparent px-1"
          onChange={event => onChange(values.map((item, i) => i === index ? event.target.value : item))}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              addEntry();
            }
          }}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={`Remove ${label.toLowerCase()} ${index + 1}${value ? `: ${value}` : ''}`}
          className="rounded p-1 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => removeEntry(index)}
        ><X className="h-3.5 w-3.5" /></button>
      </div>)}
    </div>
    <Button aria-label={`Add ${label.toLowerCase()}`} id={values.length === 0 ? id : undefined} ref={addButton} type="button" size="sm" variant="outline" disabled={disabled} onClick={addEntry}>
      <Plus className="h-3.5 w-3.5" />Add {label.toLowerCase()}
    </Button>
    <p id={`${id}-help`} className="text-xs text-muted-foreground">One entry per field. Empty entries and duplicates are removed on save; pasted comma-separated lists are split.</p>
  </div>;
}
