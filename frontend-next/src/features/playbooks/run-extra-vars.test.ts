import { describe, expect, it } from "vitest";
import { parseRunVariableDrafts, type RunVariableDraft } from "./run-extra-vars";

const row = (key: string, value: string, type: RunVariableDraft["type"] = "string", id = key): RunVariableDraft => ({ id, key, value, type });

describe("parseRunVariableDrafts", () => {
  it("returns native values for every supported input type", () => {
    expect(parseRunVariableDrafts([
      row("label", "blue"),
      row("workers", "4", "number"),
      row("strict", "true", "boolean"),
      row("options", '{"drain":false}', "json"),
    ])).toEqual({ label: "blue", workers: 4, strict: true, options: { drain: false } });
  });

  it("rejects missing, duplicate and invalid values with the affected key", () => {
    expect(() => parseRunVariableDrafts([row("", "x")])).toThrow("needs a key");
    expect(() => parseRunVariableDrafts([row("region", "a", "string", "1"), row("region", "b", "string", "2")])).toThrow("region is entered more than once");
    expect(() => parseRunVariableDrafts([row("workers", "NaN", "number")])).toThrow("workers needs a finite number");
    expect(() => parseRunVariableDrafts([row("options", "{", "json")])).toThrow("options contains invalid JSON");
  });
});
