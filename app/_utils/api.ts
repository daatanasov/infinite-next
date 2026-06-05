import { PICSUM_BASE_URL } from "./const";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PicsumImage {
  id: string;
  rawId: string;
  author: string;
  width: number;
  height: number;
}

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "aborted" }
  | { ok: false; reason: "http"; status: number }
  | { ok: false; reason: "unknown"; error: unknown };

// ── Implementation ────────────────────────────────────────────────────────────

interface RawPicsumItem {
  id: string;
  author: string;
  width: number;
  height: number;
  url: string;
  download_url: string;
}

export async function fetchPicsumPage(
  page: number,
  limit: number,
  signal: AbortSignal,
): Promise<FetchResult<PicsumImage[]>> {
  try {
    const url = `${PICSUM_BASE_URL}?page=${page}&limit=${limit}`;
    const res = await fetch(url, { signal });

    if (!res.ok) {
      return { ok: false, reason: "http", status: res.status };
    }

    const raw: RawPicsumItem[] = await res.json();
    const images: PicsumImage[] = raw.map((item) => ({
      id: `p${page}-${item.id}`,
      rawId: item.id,
      author: item.author,
      width: item.width,
      height: item.height,
    }));

    return { ok: true, data: images };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, reason: "aborted" };
    }
    return { ok: false, reason: "unknown", error: err };
  }
}
