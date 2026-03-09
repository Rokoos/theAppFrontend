const PLACEHOLDER_SKIN_IMAGE = "/assets/test-skin.png";

/**
 * Build a Steam Community CDN image URL for a skin name.
 *
 * Note: Steam normally requires an icon hash/path from the Web API.
 * This helper encodes the human-readable market hash name and uses a
 * conventional CDN pattern so it is easy to adjust later if you decide
 * to persist real icon paths. If the remote image fails, callers should
 * fall back to PLACEHOLDER_SKIN_IMAGE.
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
  const appId = options?.appId ?? 730; // default to CS2
  const iconUrl = options?.iconUrl ?? "";

  if (iconUrl && (iconUrl.startsWith("http://") || iconUrl.startsWith("https://") || iconUrl.startsWith("/"))) {
    return iconUrl;
  }

  const trimmed = (marketHashName || "").trim();
  if (!trimmed) {
    return PLACEHOLDER_SKIN_IMAGE;
  }

  const encodedName = encodeURIComponent(trimmed);

  // This pattern is a placeholder that can be updated once you decide
  // how to persist real Steam icon paths. Keeping it in one place makes
  // it easy to adjust without touching the rest of the UI.
  return `https://community.cloudflare.steamstatic.com/economy/image/class/${appId}/${encodedName}`;
}

export { PLACEHOLDER_SKIN_IMAGE };

