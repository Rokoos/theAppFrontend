/**
 * Build a SteamApis image URL for a skin (by market_hash_name).
 *
 * Uses SteamApis `/image/item/{AppID}/{market_hash_name}` endpoint, which
 * 302-redirects directly to the Steam CDN PNG/WEBP. No api_key is required.
 *
 * If you already have a concrete icon URL from Steam (or local), pass it via
 * options.iconUrl and it will be used instead. Callers are expected to attach
 * an `onError` fallback to PLACEHOLDER_SKIN_IMAGE.
 */
export function getSkinImage(
  marketHashName: string,
  options?: {
    appId?: number;
    /**
     * If you already have a full icon URL from Steam (or local),
     * pass it here and it will be preferred over the derived CDN URL.
     */
    iconUrl?: string | null;
  },
): string {
  const iconUrl = options?.iconUrl ?? "";
  const appId = options?.appId ?? 730; // default to CS2

  if (iconUrl && (iconUrl.startsWith("http://") || iconUrl.startsWith("https://") || iconUrl.startsWith("/"))) {
    return iconUrl;
  }

  const trimmed = (marketHashName || "").trim();
  if (!trimmed) {
    return "";
  }

  const encodedName = encodeURIComponent(trimmed);

  // SteamApis: redirects to the actual Steam CDN image for this item.
  return `https://api.steamapis.com/image/item/${appId}/${encodedName}`;
}

