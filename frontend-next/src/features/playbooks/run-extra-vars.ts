export type RunVariableType = "string" | "number" | "boolean" | "json";

export interface RunVariableDraft {
  id: string;
  key: string;
  value: string;
  type: RunVariableType;
}

export function parseRunVariableDrafts(rows: RunVariableDraft[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) throw new Error("Every run variable needs a key.");
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,99}$/.test(key)) {
      throw new Error(`Variable ${key} must start with a letter or underscore and contain only letters, digits or underscores.`);
    }
    if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error(`Variable ${key} is entered more than once.`);
    if (row.type === "number") {
      if (!row.value.trim() || !Number.isFinite(Number(row.value))) throw new Error(`Variable ${key} needs a finite number.`);
      result[key] = Number(row.value);
    } else if (row.type === "boolean") {
      if (row.value !== "true" && row.value !== "false") throw new Error(`Variable ${key} needs true or false.`);
      result[key] = row.value === "true";
    } else if (row.type === "json") {
      try {
        result[key] = JSON.parse(row.value);
      } catch {
        throw new Error(`Variable ${key} contains invalid JSON.`);
      }
    } else {
      result[key] = row.value;
    }
  }
  return result;
}
