import { useCallback, useEffect, useState } from "react";

function tabFromLocation(defaultValue: string, allowedValues: readonly string[], parameter = "tab") {
  if (typeof window === "undefined") return defaultValue;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const candidate = params.get(parameter);
  return candidate && allowedValues.includes(candidate) ? candidate : defaultValue;
}

/**
 * Keeps a detail view's active tab in the URL without coupling the component
 * to a specific TanStack Router route. Hash changes are history entries, so
 * refresh, shared links, and browser back/forward all preserve the view.
 */
export function useUrlTab(defaultValue: string, allowedValues: readonly string[], parameter = "tab") {
  const [value, setValue] = useState(() =>
    tabFromLocation(defaultValue, allowedValues, parameter),
  );

  useEffect(() => {
    const syncFromUrl = () =>
      setValue(tabFromLocation(defaultValue, allowedValues, parameter));
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    syncFromUrl();
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, [allowedValues, defaultValue, parameter]);

  const onValueChange = useCallback(
    (nextValue: string) => {
      if (!allowedValues.includes(nextValue)) return;
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.hash.replace(/^#/, ""));
      params.set(parameter, nextValue);
      url.hash = params.toString();
      window.history.pushState(window.history.state, "", url);
      setValue(nextValue);
    },
    [allowedValues, parameter],
  );

  return { value, onValueChange };
}
