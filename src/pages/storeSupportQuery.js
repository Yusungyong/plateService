// Query keys mirror the existing APIs. Callers explicitly label browser-only filters.
export function readWorkspaceQuery(params, defaults, choices = {}) {
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const value = params.get(key) || fallback;
    return [key, choices[key] && value && !choices[key].includes(value) ? fallback : value];
  }));
}

export function writeWorkspaceQuery(setSearchParams, lastQuery, values, approvedNavigation) {
  const next = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); });
  lastQuery.current = next.toString();
  if (approvedNavigation) approvedNavigation.current = true;
  setSearchParams(next);
}

export function focusWorkspaceList(ref) {
  requestAnimationFrame(() => {
    ref.current?.scrollIntoView?.({block: "nearest"});
    ref.current?.focus({preventScroll: true});
  });
}
