import { useIsFetching, useIsMutating } from "@tanstack/react-query";

// Safety-net indicator for any backend/third-party call not already covered
// by a local Button/IconButton spinner — background refetches, navigation
// loads, anything fired outside a click handler.
export function GlobalLoadingBar() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const active = isFetching + isMutating > 0;

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-brand/15"
    >
      <div className="h-full w-1/3 animate-loading-bar bg-brand" />
    </div>
  );
}
