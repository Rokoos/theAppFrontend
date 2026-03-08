import React, { useEffect, useState } from "react";
import { API_BASE_URL, apiClient } from "./api";
import { WebGLCanvas, SkinCard } from "./components/WebGLCanvas";

type Locale = "en" | "pl";

const TARGET_APP_IDS = [730, 252490, 570, 440] as const;

const TARGET_GAMES = [
  { appid: 730, code: "CS2", name: "Counter‑Strike 2" },
  { appid: 252490, code: "Rust", name: "Rust" },
  { appid: 570, code: "Dota 2", name: "Dota 2" },
  { appid: 440, code: "TF2", name: "Team Fortress 2" },
] as const;

type SteamUser = {
  steamid: string;
  personaname: string;
  avatar: string;
};

type SteamGame = {
  appid: number;
  name: string;
  playtimeHours: number;
  iconHash?: string;
};

type GameInventory = {
  appid: number;
  gameName: string;
  owned: boolean;
  items: SkinCard[];
};

const TEXT: Record<
  Locale,
  {
    homeEyebrow: string;
    homeTitle: string;
    homeSubtitle: string;
    homeCardTitle: string;
    homeCardKicker: string;
    // homeDescription: string;
    // homeBullet1: string;
    // homeBullet2: string;
    // homeBullet3: string;
    loginChecking: string;
    loginWithSteam: string;
    profileWelcome: string;
    // profileInfo: string;
    logout: string;
    gamesTitle: string;
    gamesLoading: string;
    gamesCount: (n: number) => string;
    gamesEmpty: string;
    playtimeLabel: string;
    skinTitle: string;
    skinKicker: string;
    skinDescription: string;
    // footerLeft: string;
    footerRight: string;
    errorLoadGames: string;
    errorStartLogin: string;
    gameNotOwned: string;
    noSkinsForGame: (gameName: string) => string;
    emptyVaultTitle: string;
    emptyVaultBody: string;
    skinsFoundLabel: (count: number) => string;
    skinsGalleryTitle: string;
    viewSwitcherHint: string;
    view2D: string;
    view3D: string;
    debugMockDescription: (appid: number, index: number) => string;
    firefoxLoginHint: string;
  }
> = {
  en: {
    homeEyebrow: "Steam inventory manager",
    homeTitle: "Your Steam inventory under control.",
    homeSubtitle:
      "Sign in with Steam to pull your inventory into a single, fast  dashboard — the foundation for trading, pricing and loadout tools.",
    homeCardTitle: "Steam inventory manager",
    homeCardKicker: "One place to understand and curate your library.",
    // homeDescription:
    //   "Connect your Steam account to explore your games, track playtime, and experiment with how you might organise skins, items, and loadouts — all from a fast, focused dashboard.",
    // homeBullet1: "See all owned games",
    // homeBullet2: "Sort by playtime",
    // homeBullet3: "Foundation for inventory tools",
    loginChecking: "Checking session…",
    loginWithSteam: "Login with Steam",
    profileWelcome:
      // "Welcome back. This is your personal inventory hub — starting with an overview of every game tied to your Steam account.",
      "Welcome back. This is your personal inventory hub.",
    // profileInfo:
    //   "Games are fetched live from the Steam Web API using your authenticated session.",
    logout: "Logout",
    gamesTitle: "Your games",
    gamesLoading: "Loading games from Steam…",
    gamesCount: (n) => `Showing ${n} games from your library.`,
    gamesEmpty: "No games found yet for this account.",
    playtimeLabel: "Playtime",
    skinTitle: "Skin preview",
    skinKicker: "3D space for your cosmetic items.",
    skinDescription:
      "This scene can focus on the cosmetics that matter most — weapon skins, agents, stickers and more, driven directly from your inventory data.",
    // footerLeft:
    //   "Powered by Steam Web API. This app reads, but never changes, your account data.",
    footerRight: "Created by Rokus Web Solutions.",
    errorLoadGames: "Failed to load games",
    errorStartLogin: "Failed to start Steam login",
    gameNotOwned: "Game not found in the library",
    noSkinsForGame: (gameName) => `No skins found for ${gameName}`,
    emptyVaultTitle: "Empty Vault",
    emptyVaultBody:
      "We could not find CS2, Rust, Dota 2 or TF2 on this account. If you think this is wrong, double-check your Steam privacy settings (profile and inventory set to public).",
    skinsFoundLabel: (count) => `${count} skins found`,
    skinsGalleryTitle: "Skins gallery",
    viewSwitcherHint: "Switch between 2D grid and 3D scene.",
    view2D: "2D",
    view3D: "3D",
    debugMockDescription: (appid, index) =>
      `Factory New\nAppID: ${appid}\nDebug mock skin #${index} (no live Steam data).`,
    firefoxLoginHint:
      "Login succeeded but Firefox blocked the session cookie. Click the shield icon in the address bar → turn off Enhanced Tracking Protection for this site, then try logging in again. Or use Chrome.",
  },
  pl: {
    homeEyebrow: "Menedżer ekwipunku Steam",
    homeTitle: "Twoje zasoby Steam pod kontrolą.",
    homeSubtitle:
      "Zaloguj się przez Steam, aby zebrać zasoby  w jednym, szybkim panelu — bazie pod narzędzia do trade'u, wycen i konfiguracji zestawów.",
    homeCardTitle: "Menedżer ekwipunku Steam",
    homeCardKicker: "Jedno miejsce do ogarnięcia całej biblioteki.",
    // homeDescription:
    //   "Połącz konto Steam, aby przeglądać gry, śledzić czas gry i planować, jak chcesz zarządzać skinami, przedmiotami i loadoutami — w lekkim, przejrzystym interfejsie.",
    // homeBullet1: "Wszystkie posiadane gry",
    // homeBullet2: "Sortowanie po czasie gry",
    // homeBullet3: "Fundament pod narzędzia do ekwipunku",
    loginChecking: "Sprawdzanie sesji…",
    loginWithSteam: "Zaloguj przez Steam",
    profileWelcome:
      // "Witaj ponownie. To Twój osobisty hub ekwipunku — zaczynamy od pełnej listy gier przypisanych do konta Steam.",
      "Witaj ponownie. To Twój osobisty hub ekwipunku.",
    // profileInfo:
    //   "Gry są pobierane na żywo z Steam Web API na podstawie Twojej zalogowanej sesji.",
    logout: "Wyloguj",
    gamesTitle: "Twoje gry",
    gamesLoading: "Ładowanie gier ze Steam…",
    gamesCount: (n) => `Wyświetlono ${n} gier z Twojej biblioteki.`,
    gamesEmpty: "Nie znaleziono jeszcze gier dla tego konta.",
    playtimeLabel: "Czas gry",
    skinTitle: "Podgląd skinów",
    skinKicker: "Przestrzeń 3D dla Twoich kosmetyków.",
    skinDescription:
      "To miejsce może skupić się na tym, co najważniejsze — skinach do broni, postaciach, naklejkach i innych elementach kosmetycznych z Twojego ekwipunku.",
    // footerLeft:
    //   "Korzysta z Steam Web API. Aplikacja tylko odczytuje dane z Twojego konta.",
    footerRight: "Utworzone przez Rokus Web Solutions",
    errorLoadGames: "Nie udało się załadować listy gier",
    errorStartLogin: "Nie udało się rozpocząć logowania przez Steam",
    gameNotOwned: "Gra nie została znaleziona w bibliotece",
    noSkinsForGame: (gameName) => `Nie znaleziono skinów dla gry ${gameName}`,
    emptyVaultTitle: "Pusty skarbiec",
    emptyVaultBody:
      "Nie znaleźliśmy CS2, Rust, Dota 2 ani TF2 na tym koncie. Jeśli to błąd, sprawdź ustawienia prywatności Steam (profil i ekwipunek ustawione na publiczne).",
    skinsFoundLabel: (count) => `Znaleziono ${count} skinów`,
    skinsGalleryTitle: "Galeria skinów",
    viewSwitcherHint: "Przełącz między siatką 2D a sceną 3D.",
    view2D: "2D",
    view3D: "3D",
    debugMockDescription: (appid, index) =>
      `Stan: Fabrycznie nowy\nAppID: ${appid}\nSkin testowy #${index} (brak danych z Steam).`,
    firefoxLoginHint:
      "Logowanie się powiodło, ale Firefox zablokował ciasteczko sesji. Kliknij tarczę w pasku adresu → wyłącz Ulepszoną ochronę przed śledzeniem dla tej witryny i zaloguj się ponownie. Możesz też użyć Chrome.",
  },
};

export const App: React.FC = () => {
  const [locale, setLocale] = useState<Locale>("pl");
  const [user, setUser] = useState<SteamUser | null>(null);
  const [games, setGames] = useState<SteamGame[]>([]);
  const [selectedGameForSkins, setSelectedGameForSkins] =
    useState<SteamGame | null>(null);
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingGames, setLoadingGames] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventories, setInventories] = useState<Record<number, GameInventory>>(
    {},
  );
  const [ownsAnyTarget, setOwnsAnyTarget] = useState<boolean | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<SkinCard | null>(null);
  const [showFirefoxHint, setShowFirefoxHint] = useState(false);

  const t = TEXT[locale];

  const isFirefox = () => /Firefox|FxiOS/i.test(navigator.userAgent);

  const fetchMe = async () => {
    try {
      setLoadingUser(true);
      setError(null);
      const resp = await apiClient.get<{ user: SteamUser }>("/api/auth/me");
      setUser(resp.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchGames = async () => {
    if (!user) return;
    try {
      setLoadingGames(true);
      setError(null);
      const resp = await apiClient.get<{ games: SteamGame[] }>(
        "/api/auth/me/games",
      );
      setGames(resp.data.games);
    } catch (e: any) {
      setError(e?.response?.data?.error || t.errorLoadGames);
    } finally {
      setLoadingGames(false);
    }
  };

  const fetchInventories = async () => {
    if (!user) return;
    try {
      const resp = await apiClient.get<{
        inventories: Record<string, GameInventory>;
        ownsAnyTarget: boolean;
      }>("/api/auth/me/inventory");
      const mapped: Record<number, GameInventory> = {};
      Object.values(resp.data.inventories).forEach((inv) => {
        mapped[inv.appid] = inv;
      });
      setInventories(mapped);
      setOwnsAnyTarget(resp.data.ownsAnyTarget);
    } catch {
      // keep silent; skins are an enhancement over core games list
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/api/auth/logout", {});
    } finally {
      setUser(null);
      setGames([]);
    }
  };

  useEffect(() => {
    void fetchMe();
  }, []);

  useEffect(() => {
    if (loadingUser || user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "ok" && isFirefox()) {
      setShowFirefoxHint(true);
      params.delete("login");
      const clean =
        window.location.pathname +
        (params.toString() ? "?" + params.toString() : "") +
        window.location.hash;
      window.history.replaceState(null, "", clean);
    }
  }, [loadingUser, user]);

  useEffect(() => {
    if (user) {
      void fetchGames();
      void fetchInventories();
    }
  }, [user?.steamid]);

  const renderLoggedOut = () => (
    <main className="app-grid">
      <section className="app-column">
        <article className="card">
          <div className="card-inner">
            <div className="card-header">
              <div className="card-title-block">
                <h2 className="card-title">{t.homeCardTitle}</h2>
                <p className="card-kicker">{t.homeCardKicker}</p>
              </div>
            </div>
            <div className="card-body">
              {/* <p>{t.homeDescription}</p> */}
              {/* <div className="pill-row-small">
                <span className="pill-small">{t.homeBullet1}</span>
                <span className="pill-small">{t.homeBullet2}</span>
                <span className="pill-small">{t.homeBullet3}</span>
              </div> */}
              <div className="button-row">
                {loadingUser ? (
                  <span className="button-primary" style={{ opacity: 0.8 }}>
                    {t.loginChecking}
                  </span>
                ) : (
                  <a
                    className="button-primary"
                    href={`${API_BASE_URL}/api/auth/steam/start`}
                    target="_self"
                    rel="noopener noreferrer"
                  >
                    {t.loginWithSteam}
                  </a>
                )}
              </div>
              {error && (
                <div className="status-text status-text--error">{error}</div>
              )}
              {showFirefoxHint && (
                <div
                  className="status-text"
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    background: "rgba(251, 191, 36, 0.12)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(251, 191, 36, 0.35)",
                  }}
                >
                  {t.firefoxLoginHint}
                </div>
              )}
            </div>
          </div>
        </article>
      </section>
    </main>
  );

  const renderLoggedIn = () => (
    <main className="app-grid">
      <section className="app-column">
        <article className="card">
          <div className="card-inner">
            <div className="card-header">
              <div className="avatar-row">
                <img src={user?.avatar} alt="avatar" className="avatar-img" />
                <div className="avatar-meta">
                  <div className="avatar-name">{user?.personaname}</div>
                  <div className="avatar-id">SteamID: {user?.steamid}</div>
                </div>
              </div>
              <button className="button-secondary" onClick={logout}>
                {t.logout}
              </button>
            </div>
            <div className="card-body">
              <p>{t.profileWelcome}</p>
              {/* <p className="status-text">{t.profileInfo}</p> */}
            </div>
          </div>
        </article>
      </section>

      {user && (
        <section className="app-column" style={{ gridColumn: "1 / -1" }}>
          <div className="game-switcher">
            {TARGET_GAMES.map((g) => {
              const inv = inventories[g.appid];
              const hasSkins = inv && inv.items && inv.items.length > 0;
              const isSelected = selectedGameForSkins?.appid === g.appid;
              const disabled = !hasSkins && ownsAnyTarget !== null;
              return (
                <button
                  key={g.appid}
                  type="button"
                  className={`game-switcher-button${isSelected ? " game-switcher-button--active" : ""}`}
                  disabled={disabled}
                  onClick={() =>
                    setSelectedGameForSkins(
                      games.find((gm) => gm.appid === g.appid) || {
                        appid: g.appid,
                        name: g.name,
                        playtimeHours: 0,
                      },
                    )
                  }
                >
                  <span className="game-switcher-code">{g.code}</span>
                  <span className="game-switcher-name">{g.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {selectedGameForSkins && inventories[selectedGameForSkins.appid] && (
        <section className="app-column" style={{ gridColumn: "1 / -1" }}>
          <article className="card">
            <div className="card-inner">
              <div className="card-header">
                <div className="card-title-block">
                  <h2 className="card-title">
                    {t.skinsGalleryTitle}{" "}
                    <span
                      style={{ color: "var(--text-muted)", fontWeight: 500 }}
                    >
                      ({selectedGameForSkins.name})
                    </span>
                  </h2>
                  {/* <p className="card-kicker">{t.viewSwitcherHint}</p> */}
                </div>
                <div className="view-switcher">
                  <button
                    type="button"
                    className={`view-switcher-toggle${viewMode === "2D" ? " view-switcher-toggle--active" : ""}`}
                    onClick={() => setViewMode("2D")}
                  >
                    <span className="view-switcher-icon">▦</span>
                    <span className="view-switcher-label">{t.view2D}</span>
                  </button>
                  <button
                    type="button"
                    className={`view-switcher-toggle${viewMode === "3D" ? " view-switcher-toggle--active" : ""}`}
                    // onClick={() => setViewMode("3D")}
                  >
                    <span className="view-switcher-icon">⬢</span>
                    <span className="view-switcher-label">{t.view3D}</span>
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="gallery-view" key={viewMode}>
                  {viewMode === "2D" ? (
                    <div className="skin-grid-2d">
                      {(() => {
                        const base =
                          inventories[selectedGameForSkins.appid].items;
                        const maxCards = 8;
                        const sourceCount = Math.min(
                          base.length || 1,
                          maxCards,
                        );
                        const cards: SkinCard[] = [];
                        for (let i = 0; i < maxCards; i += 1) {
                          const src = base[i % sourceCount];
                          cards.push({
                            ...src,
                            name: `${src.name} #${i + 1}`,
                          });
                        }
                        return cards;
                      })().map((skin, idx) => (
                        <button
                          key={`${skin.name}-${idx}`}
                          type="button"
                          className="skin-card-2d"
                          onClick={() => setSelectedSkin(skin)}
                        >
                          <div className="skin-card-2d-image-wrap">
                            <img
                              src={skin.iconUrl}
                              alt={skin.name}
                              className="skin-card-2d-image"
                            />
                          </div>
                          <div className="skin-card-2d-footer">
                            <div className="skin-card-2d-name">{skin.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="canvas-shell"
                      style={{ padding: "0.75rem" }}
                    >
                      <WebGLCanvas
                        skins={inventories[selectedGameForSkins.appid].items}
                        onSkinSelect={setSelectedSkin}
                      />
                    </div>
                  )}
                </div>

                {selectedSkin && (
                  <div
                    style={{
                      marginTop: "0.85rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <div style={{ fontWeight: 650 }}>{selectedSkin.name}</div>
                    <div
                      style={{
                        whiteSpace: "pre-line",
                        marginTop: "0.25rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {(() => {
                        const desc = selectedSkin.description;
                        const isMockFromApi =
                          selectedSkin.isMock &&
                          selectedSkin.mockIndex != null &&
                          selectedGameForSkins;
                        const isMockFromContent =
                          desc.includes("no live Steam data") &&
                          selectedGameForSkins;
                        const matchIndex = desc.match(
                          /#(\d+)\s*\(no live Steam/,
                        );
                        const index =
                          selectedSkin.mockIndex ??
                          (matchIndex ? Number(matchIndex[1]) : 1);
                        const appid = selectedGameForSkins?.appid ?? 0;
                        if (isMockFromApi || isMockFromContent)
                          return t.debugMockDescription(appid, index);
                        return desc;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        </section>
      )}
    </main>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title-block">
          <div className="app-title-eyebrow">
            <span className="pill-dot" />
            {t.homeEyebrow}
          </div>
          <h1 className="app-title">{t.homeTitle}</h1>
          <p className="app-subtitle">{t.homeSubtitle}</p>
        </div>
        <div className="lang-toggle">
          <button
            className={`lang-toggle-button ${locale === "en" ? "lang-toggle-button--active" : ""}`}
            type="button"
            onClick={() => setLocale("en")}
          >
            EN
          </button>
          <button
            className={`lang-toggle-button ${locale === "pl" ? "lang-toggle-button--active" : ""}`}
            type="button"
            onClick={() => setLocale("pl")}
          >
            PL
          </button>
        </div>
      </header>

      {user ? renderLoggedIn() : renderLoggedOut()}

      <footer className="footer-note">
        {/* <span>{t.footerLeft}</span> */}
        <span>{t.footerRight}</span>
      </footer>
    </div>
  );
};
