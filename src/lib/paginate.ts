import type { KyInstance } from "ky";

// Backend caps `limit` at 200 per page. A home library is small, but we still
// loop pages so the result is complete; a safety cap prevents an unbounded
// fetch if the dataset is unexpectedly large.
const PAGE_SIZE = 200;
const SAFETY_CAP = 5000;

// Fetches every page of a list endpoint and concatenates the results.
// `path` must already include any base prefix and end without query string.
export async function fetchAllPages<T>(
  client: KyInstance,
  path: string,
  extraParams: Record<string, string | number> = {},
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await client
      .get(path, { searchParams: { ...extraParams, limit: PAGE_SIZE, offset } })
      .json<T[]>();
    all.push(...page);
    if (page.length < PAGE_SIZE || all.length >= SAFETY_CAP) break;
    offset += PAGE_SIZE;
  }
  return all;
}
