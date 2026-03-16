import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL, apiClient } from "./api";
import { WebGLCanvas, SkinCard } from "./components/WebGLCanvas";
import { getSkinImage, PLACEHOLDER_SKIN_IMAGE } from "./utils/skins";
import { PriceHistoryChart } from "./components/PriceHistoryChart";

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

type AlertItem = {
  _id: string;
  marketHashName: string;
  gameId: number;
  targetPrice: number;
  condition: "below" | "above";
  isActive: boolean;
};

type MarketItem = {
  marketHashName: string;
  suggestedPrice?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  source?: string;
  currency?: string;
};

type MarketCurrency = "USD" | "EUR" | "PLN";
type MarketSource = "all" | "skinport" | "dmarket";

const CURRENCY_SYMBOLS: Record<MarketCurrency, string> = {
  USD: "$",
  EUR: "€",
  PLN: "zł",
};

function formatPrice(value: number, currency: MarketCurrency): string {
  const sym = CURRENCY_SYMBOLS[currency];
  return sym === "zł" ? `${value.toFixed(2)} zł` : `${sym}${value.toFixed(2)}`;
}

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
    errorConnection: string;
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
    tabSkins: string;
    tabWatchlist: string;
    targetPrice: string;
    conditionBelow: string;
    conditionAbove: string;
    addAlert: string;
    alertLimitReached: string;
    watchlistEmpty: string;
    marketPrices: string;
    marketSourceAll: string;
    marketSourceSkinport: string;
    marketSourceDmarket: string;
    marketLoading: string;
    marketEmpty: string;
    yourInventory: string;
    inventoryLoading: string;
    cancel: string;
    targetPriceLabel: (currency: string) => string;
    currencyUsd: string;
    currencyEur: string;
    currencyPln: string;
    showMore: string;
    itemsLeft: string;
    prevPage: string;
    nextPage: string;
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
    errorConnection: "Could not reach server. Is the backend running?",
    gameNotOwned: "Game not found in the library",
    noSkinsForGame: (gameName) => `No skins found for ${gameName}`,
    emptyVaultTitle: "Empty Vault",
    emptyVaultBody:
      "We could not find CS2, Rust, Dota 2 or TF2 on this account. If you think this is wrong, double-check your Steam privacy settings (profile and inventory set to public).",
    skinsFoundLabel: (count) => `${count} skins found`,
    skinsGalleryTitle: "User's skins gallery",
    viewSwitcherHint: "Switch between 2D grid and 3D scene.",
    view2D: "2D",
    view3D: "3D",
    debugMockDescription: (appid, index) =>
      `Factory New\nAppID: ${appid}\nDebug mock skin #${index} (no live Steam data).`,
    firefoxLoginHint:
      "Login succeeded but Firefox blocked the session cookie. Click the shield icon in the address bar → turn off Enhanced Tracking Protection for this site, then try logging in again. Or use Chrome.",
    tabSkins: "Skins",
    tabWatchlist: "Watchlist",
    targetPrice: "Target price",
    conditionBelow: "Below",
    conditionAbove: "Above",
    addAlert: "Add alert",
    alertLimitReached: "Limit reached. Upgrade to Pro.",
    watchlistEmpty: "No alerts yet. Add one from the Skins tab.",
    marketPrices: "Market prices (SkinPort & DMarket)",
    marketSourceAll: "All",
    marketSourceSkinport: "SkinPort",
    marketSourceDmarket: "DMarket",
    marketLoading: "Loading market…",
    marketEmpty: "No market data for this game.",
    yourInventory: "Your inventory",
    inventoryLoading: "Loading skins…",
    cancel: "Cancel",
    targetPriceLabel: (currency) => `Target price (${currency})`,
    currencyUsd: "USD ($)",
    currencyEur: "EUR (€)",
    currencyPln: "PLN (zł)",
    showMore: "Show more",
    itemsLeft: "left",
    prevPage: "Previous",
    nextPage: "Next",
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
    errorConnection: "Nie można połączyć z serwerem. Czy backend jest uruchomiony?",
    gameNotOwned: "Gra nie została znaleziona w bibliotece",
    noSkinsForGame: (gameName) => `Nie znaleziono skinów dla gry ${gameName}`,
    emptyVaultTitle: "Pusty skarbiec",
    emptyVaultBody:
      "Nie znaleźliśmy CS2, Rust, Dota 2 ani TF2 na tym koncie. Jeśli to błąd, sprawdź ustawienia prywatności Steam (profil i ekwipunek ustawione na publiczne).",
    skinsFoundLabel: (count) => `Znaleziono ${count} skinów`,
    skinsGalleryTitle: "Galeria skinów użytkownika",
    viewSwitcherHint: "Przełącz między siatką 2D a sceną 3D.",
    view2D: "2D",
    view3D: "3D",
    debugMockDescription: (appid, index) =>
      `Stan: Fabrycznie nowy\nAppID: ${appid}\nSkin testowy #${index} (brak danych z Steam).`,
    firefoxLoginHint:
      "Logowanie się powiodło, ale Firefox zablokował ciasteczko sesji. Kliknij tarczę w pasku adresu → wyłącz Ulepszoną ochronę przed śledzeniem dla tej witryny i zaloguj się ponownie. Możesz też użyć Chrome.",
    tabSkins: "Skiny",
    tabWatchlist: "Obserwowane",
    targetPrice: "Cena docelowa",
    conditionBelow: "Poniżej",
    conditionAbove: "Powyżej",
    addAlert: "Dodaj alert",
    alertLimitReached: "Limit osiągnięty. Przejdź na Pro.",
    watchlistEmpty: "Brak alertów. Dodaj z zakładki Skiny.",
    marketPrices: "Ceny rynkowe (SkinPort & DMarket)",
    marketSourceAll: "Wszystkie",
    marketSourceSkinport: "SkinPort",
    marketSourceDmarket: "DMarket",
    marketLoading: "Ładowanie rynku…",
    marketEmpty: "Brak danych rynkowych dla tej gry.",
    yourInventory: "Twój ekwipunek",
    inventoryLoading: "Ładowanie skinów…",
    cancel: "Anuluj",
    targetPriceLabel: (currency) => `Cena docelowa (${currency})`,
    currencyUsd: "USD ($)",
    currencyEur: "EUR (€)",
    currencyPln: "PLN (zł)",
    showMore: "Pokaż więcej",
    itemsLeft: "pozostało",
    prevPage: "Poprzednia",
    nextPage: "Następna",
  },
};

export const App: React.FC = () => {
  const [locale, setLocale] = useState<Locale>("pl");
  const [user, setUser] = useState<SteamUser | null>(null);
  const [games, setGames] = useState<SteamGame[]>([]);
  const [selectedGameForSkins, setSelectedGameForSkins] =
    useState<SteamGame | null>(null);
  const [selectedGameForMarket, setSelectedGameForMarket] =
    useState<SteamGame | null>(null);
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingGames, setLoadingGames] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventories, setInventories] = useState<Record<number, GameInventory>>(
    {},
  );
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [ownsAnyTarget, setOwnsAnyTarget] = useState<boolean | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<SkinCard | null>(null);
  const [showFirefoxHint, setShowFirefoxHint] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<"skins" | "watchlist">(
    "skins",
  );
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsTier, setAlertsTier] = useState<"free" | "pro">("free");
  const [alertsLimit, setAlertsLimit] = useState(3);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    skin: SkinCard;
    gameId: number;
  } | null>(null);
  const [skinModal, setSkinModal] = useState<
    | {
        source: "market";
        item: MarketItem;
        gameId: number;
      }
    | {
        source: "inventory";
        item: SkinCard;
        gameId: number;
      }
    | null
  >(null);
  const [skinModalView, setSkinModalView] = useState<"2D" | "3D">("2D");
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState<"below" | "above">(
    "below",
  );
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [marketTotal, setMarketTotal] = useState(0);
  const [marketPage, setMarketPage] = useState(1);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketCurrency, setMarketCurrency] = useState<MarketCurrency>("USD");
  const [marketSource, setMarketSource] = useState<MarketSource>("all");
  const marketSectionRef = useRef<HTMLElement | null>(null);
  const [inventoryPage, setInventoryPage] = useState(1);
  const inventorySectionRef = useRef<HTMLElement | null>(null);
  const inventoryScrollRunRef = useRef(0);
  const [historyRangeDays, setHistoryRangeDays] = useState<7 | 30 | 90>(7);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPoints, setHistoryPoints] = useState<
    { time: string; median: number }[]
  >([]);
  const [historyWarning, setHistoryWarning] = useState<
    "unsupported-game" | "no-points" | "error" | null
  >(null);

  const t = TEXT[locale];

  const isFirefox = () => /Firefox|FxiOS/i.test(navigator.userAgent);

  const fetchMe = async () => {
    try {
      setLoadingUser(true);
      setError(null);
      const resp = await apiClient.get<{ user: SteamUser }>("/api/auth/me", {
        validateStatus: (status) => status === 200 || status === 401,
      });
      if (resp.status === 401) {
        setUser(null);
      } else {
        setUser(resp.data.user);
      }
    } catch (e: any) {
      setUser(null);
      const msg =
        e?.code === "ECONNABORTED"
          ? t.errorConnection
          : e?.response?.data?.error ?? e?.message;
      if (msg) setError(msg);
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
      setLoadingInventories(true);
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
    } finally {
      setLoadingInventories(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/api/auth/logout", {});
    } finally {
      setUser(null);
      setGames([]);
      setAlerts([]);
    }
  };

  const fetchAlerts = async () => {
    if (!user) return;
    try {
      setLoadingAlerts(true);
      const resp = await apiClient.get<{
        alerts: AlertItem[];
        tier: string;
        alertLimit: number;
      }>("/api/alerts");
      setAlerts(resp.data.alerts || []);
      setAlertsTier((resp.data.tier as "free" | "pro") || "free");
      setAlertsLimit(resp.data.alertLimit ?? 3);
    } catch {
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const openSkinModalFromMarket = (item: MarketItem) => {
    if (!selectedGameForMarket) return;
    setSkinModal({
      source: "market",
      item,
      gameId: selectedGameForMarket.appid,
    });
    setSkinModalView("2D");
  };

  const openSkinModalFromInventory = (skin: SkinCard) => {
    if (!selectedGameForSkins) return;
    setSelectedSkin(skin);
    setSkinModal({
      source: "inventory",
      item: skin,
      gameId: selectedGameForSkins.appid,
    });
    setSkinModalView("2D");
  };

  const openAlertModal =
    (skin: SkinCard, gameId: number) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setAlertModal({ skin, gameId });
      setAlertTargetPrice("");
      setAlertCondition("below");
    };

  const submitAlert = async () => {
    if (!alertModal || !alertTargetPrice.trim()) return;
    const targetPrice = parseFloat(alertTargetPrice.replace(",", "."));
    if (Number.isNaN(targetPrice) || targetPrice <= 0) return;
    setAlertSubmitting(true);
    try {
      await apiClient.post("/api/alerts", {
        marketHashName: alertModal.skin.name,
        gameId: alertModal.gameId,
        targetPrice,
        condition: alertCondition,
      });
      setAlertModal(null);
      void fetchAlerts();
    } catch (e: any) {
      const err = e?.response?.data;
      if (e?.response?.status === 403 && err?.code === "ALERT_LIMIT_REACHED") {
        showToast(t.alertLimitReached);
        setAlertModal(null);
      } else {
        showToast(err?.error || "Failed to add alert");
      }
    } finally {
      setAlertSubmitting(false);
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

  useEffect(() => {
    if (user && dashboardTab === "watchlist") void fetchAlerts();
  }, [user?.steamid, dashboardTab]);

  const MARKET_PAGE_SIZE = 50;
  const INVENTORY_PAGE_SIZE = 20;

  const fetchMarketPrices = async (
    page: number,
    gameOverride?: SteamGame | null,
  ) => {
    const game = gameOverride ?? selectedGameForMarket;
    if (!user || !game) return;
    setLoadingMarket(true);
    try {
      const offset = (page - 1) * MARKET_PAGE_SIZE;
      const resp = await apiClient.get<{ items: MarketItem[]; total: number }>(
        "/api/market/prices",
        {
          params: {
            gameId: game.appid,
            currency: marketCurrency,
            source: marketSource,
            limit: MARKET_PAGE_SIZE,
            offset,
          },
        },
      );
      const rawItems = resp.data.items ?? [];
      const total = Number(resp.data.total) || 0;
      const items = Array.isArray(rawItems)
        ? rawItems.slice(0, MARKET_PAGE_SIZE)
        : [];
      setMarketItems(items);
      setMarketTotal(total);
      setMarketPage(page);
      if (
        page !== 1 &&
        marketSectionRef.current &&
        typeof window !== "undefined"
      ) {
        const el = marketSectionRef.current;
        const rect = el.getBoundingClientRect();
        const headerOffset = 80; // approximate header height
        const targetTop = Math.max(window.scrollY + rect.top - headerOffset, 0);
        window.scrollTo({
          top: targetTop,
          behavior: "smooth",
        });
      }
    } catch {
      setMarketItems([]);
      setMarketTotal(0);
    } finally {
      setLoadingMarket(false);
    }
  };

  useEffect(() => {
    if (user && dashboardTab === "skins") {
      const defaultGame = {
        appid: TARGET_GAMES[0].appid,
        name: TARGET_GAMES[0].name,
        playtimeHours: 0,
      };
      if (!selectedGameForSkins) setSelectedGameForSkins(defaultGame);
      if (!selectedGameForMarket) {
        // Initialize the default market game; actual fetching is handled
        // by the effect that watches selectedGameForMarket and filters.
        setSelectedGameForMarket(defaultGame);
      }
    }
  }, [user, dashboardTab]);

  useEffect(() => {
    if (user && selectedGameForMarket && dashboardTab === "skins") {
      setMarketPage(1);
      void fetchMarketPrices(1);
    } else {
      setMarketItems([]);
      setMarketTotal(0);
      setMarketPage(1);
    }
  }, [
    user?.steamid,
    selectedGameForMarket?.appid,
    dashboardTab,
    marketCurrency,
    marketSource,
  ]);

  useEffect(() => {
    setInventoryPage(1);
  }, [selectedGameForSkins?.appid]);

  useEffect(() => {
    inventoryScrollRunRef.current += 1;
    if (inventoryScrollRunRef.current === 1) return;
    if (!inventorySectionRef.current || typeof window === "undefined") return;
    const el = inventorySectionRef.current;
    const rect = el.getBoundingClientRect();
    const headerOffset = 80;
    const targetTop = Math.max(window.scrollY + rect.top - headerOffset, 0);
    window.scrollTo({ top: targetTop, behavior: "smooth" });
  }, [inventoryPage]);

  // Load SkinPort price history for the current skin in the modal (market source only).
  useEffect(() => {
    if (!skinModal || skinModal.source !== "market") {
      setHistoryPoints([]);
      setHistoryWarning(null);
      setHistoryLoading(false);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        setHistoryLoading(true);
        setHistoryWarning(null);
        setHistoryPoints([]);
        const resp = await apiClient.get<{
          points: { time: string; median: number }[];
          warning?: "unsupported-game" | "no-points" | "error" | null;
        }>("/api/market/history", {
          params: {
            gameId: skinModal.gameId,
            marketHashName: skinModal.item.marketHashName,
            days: historyRangeDays,
          },
          signal: controller.signal,
        });
        setHistoryPoints(resp.data.points || []);
        setHistoryWarning(
          (resp.data.warning as
            | "unsupported-game"
            | "no-points"
            | "error"
            | null) || null,
        );
      } catch (e: any) {
        if (controller.signal.aborted) return;
        setHistoryPoints([]);
        setHistoryWarning("error");
      } finally {
        if (!controller.signal.aborted) {
          setHistoryLoading(false);
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [skinModal, historyRangeDays]);

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
              <div className="button-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
                <a
                  href={`${API_BASE_URL}/api/auth/steam/start`}
                  className="button-primary"
                  style={{ textDecoration: "none", color: "inherit" }}
                  target="_self"
                  rel="noopener noreferrer"
                >
                  {t.loginWithSteam}
                </a>
                {loadingUser && (
                  <span className="status-text" style={{ fontSize: "0.85rem" }}>
                    {t.loginChecking}
                  </span>
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
          <div
            className="view-switcher"
            style={{ marginBottom: "0.5rem", justifyContent: "flex-start" }}
          >
            <button
              type="button"
              className={`view-switcher-toggle${dashboardTab === "skins" ? " view-switcher-toggle--active" : ""}`}
              onClick={() => setDashboardTab("skins")}
            >
              <span className="view-switcher-label">{t.tabSkins}</span>
            </button>
            <button
              type="button"
              className={`view-switcher-toggle${dashboardTab === "watchlist" ? " view-switcher-toggle--active" : ""}`}
              onClick={() => setDashboardTab("watchlist")}
            >
              <span className="view-switcher-label">{t.tabWatchlist}</span>
            </button>
          </div>
          {dashboardTab === "watchlist" ? (
            <article className="card">
              <div className="card-inner">
                <h2 className="card-title">{t.tabWatchlist}</h2>
                <div className="card-body">
                  {loadingAlerts ? (
                    <p className="status-text">{t.loginChecking}</p>
                  ) : alerts.length === 0 ? (
                    <p className="status-text">{t.watchlistEmpty}</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {alerts.map((a) => (
                        <li
                          key={a._id}
                          style={{
                            padding: "0.5rem 0",
                            borderBottom: "1px solid var(--border-subtle)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>
                            {a.marketHashName}
                          </span>
                          <span className="status-text">
                            {a.condition === "below" ? "≤" : "≥"}{" "}
                            {formatPrice(Number(a.targetPrice), marketCurrency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="status-text" style={{ marginTop: "0.5rem" }}>
                    {alerts.length} / {alertsLimit} ({alertsTier})
                  </p>
                </div>
              </div>
            </article>
          ) : null}
        </section>
      )}

      {user && dashboardTab === "skins" && selectedGameForMarket && (
        <section className="app-column" style={{ gridColumn: "1 / -1" }}>
          <p className="status-text" style={{ marginBottom: "0.35rem" }}>
            {t.marketPrices}
          </p>
          <div className="game-switcher">
            {TARGET_GAMES.map((g) => {
              const isSelected = selectedGameForMarket.appid === g.appid;
              return (
                <button
                  key={g.appid}
                  type="button"
                  className={`game-switcher-button${isSelected ? " game-switcher-button--active" : ""}`}
                  onClick={() =>
                    setSelectedGameForMarket(
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

      {selectedGameForMarket && (
        <section
          className="app-column"
          style={{ gridColumn: "1 / -1" }}
          ref={marketSectionRef}
        >
          <article className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-inner">
              <h2 className="card-title" style={{ marginBottom: "0.5rem" }}>
                {t.marketPrices}{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                  ({selectedGameForMarket.name})
                </span>
              </h2>
              <div className="card-body">
                <div
                  className="view-switcher"
                  style={{
                    marginBottom: "0.5rem",
                    justifyContent: "flex-start",
                  }}
                >
                  {(["USD", "EUR", "PLN"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`view-switcher-toggle${marketCurrency === c ? " view-switcher-toggle--active" : ""}`}
                      onClick={() => setMarketCurrency(c)}
                    >
                      <span className="view-switcher-label">
                        {c === "USD"
                          ? t.currencyUsd
                          : c === "EUR"
                            ? t.currencyEur
                            : t.currencyPln}
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  className="view-switcher"
                  style={{
                    marginBottom: "0.75rem",
                    justifyContent: "flex-start",
                  }}
                >
                  {(["all", "skinport", "dmarket"] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      className={`view-switcher-toggle${marketSource === src ? " view-switcher-toggle--active" : ""}`}
                      onClick={() => setMarketSource(src)}
                    >
                      <span className="view-switcher-label">
                        {src === "all"
                          ? t.marketSourceAll
                          : src === "skinport"
                            ? t.marketSourceSkinport
                            : t.marketSourceDmarket}
                      </span>
                    </button>
                  ))}
                </div>
                {loadingMarket ? (
                  <p className="status-text">{t.marketLoading}</p>
                ) : marketItems.length === 0 ? (
                  <p className="status-text">{t.marketEmpty}</p>
                ) : (
                  <>
                    <div className="skin-grid-2d">
                      {marketItems.map((item, idx) => (
                        <div
                          key={`${item.marketHashName}-${idx}`}
                          style={{ position: "relative" }}
                          onClick={() => openSkinModalFromMarket(item)}
                        >
                          <div className="skin-card-2d">
                            <div className="skin-card-2d-image-wrap">
                              <img
                                src={getSkinImage(item.marketHashName, {
                                  appId: selectedGameForMarket.appid,
                                })}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = PLACEHOLDER_SKIN_IMAGE;
                                }}
                                alt={item.marketHashName}
                                className="skin-card-2d-image"
                              />
                            </div>
                            <div className="skin-card-2d-footer">
                              <div className="skin-card-2d-name">
                                {item.marketHashName}
                              </div>
                              <div
                                className="status-text"
                                style={{
                                  marginTop: "0.2rem",
                                  fontSize: "0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                {item.suggestedPrice != null
                                  ? formatPrice(
                                      item.suggestedPrice,
                                      marketCurrency,
                                    )
                                  : item.minPrice != null
                                    ? `${formatPrice(
                                        item.minPrice,
                                        marketCurrency,
                                      )} – ${
                                        item.maxPrice != null
                                          ? formatPrice(
                                              item.maxPrice,
                                              marketCurrency,
                                            )
                                          : "?"
                                      }`
                                    : "—"}
                                {marketSource === "all" && item.source && (
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      opacity: 0.85,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {item.source === "dmarket"
                                      ? "DMarket"
                                      : "SkinPort"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={t.addAlert}
                            onClick={openAlertModal(
                              {
                                name: item.marketHashName,
                                description: "",
                                iconUrl: "/assets/test-skin.png",
                              },
                              selectedGameForMarket.appid,
                            )}
                            style={{
                              position: "absolute",
                              top: "0.35rem",
                              right: "0.35rem",
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              border: "1px solid var(--border-subtle)",
                              background: "rgba(15,23,42,0.9)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.9rem",
                            }}
                          >
                            🔔
                          </button>
                        </div>
                      ))}
                    </div>
                    {marketTotal > 0 &&
                      (() => {
                        const totalPages = Math.max(
                          1,
                          Math.ceil(marketTotal / MARKET_PAGE_SIZE),
                        );
                        const showPages = (() => {
                          if (totalPages <= 7)
                            return Array.from(
                              { length: totalPages },
                              (_, i) => i + 1,
                            );
                          const around: number[] = [];
                          const add = (p: number) => {
                            if (
                              p >= 1 &&
                              p <= totalPages &&
                              !around.includes(p)
                            )
                              around.push(p);
                          };
                          add(1);
                          add(marketPage - 1);
                          add(marketPage);
                          add(marketPage + 1);
                          add(totalPages);
                          around.sort((a, b) => a - b);
                          const out: (number | "…")[] = [];
                          for (let i = 0; i < around.length; i++) {
                            if (i > 0 && around[i]! > around[i - 1]! + 1)
                              out.push("…");
                            out.push(around[i]!);
                          }
                          return out;
                        })();
                        return (
                          <div
                            style={{
                              marginTop: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.35rem",
                              flexWrap: "wrap",
                            }}
                          >
                            {marketPage > 1 && (
                              <button
                                type="button"
                                className="button-secondary"
                                disabled={loadingMarket}
                                onClick={() => {
                                  const p = marketPage - 1;
                                  if (p >= 1) void fetchMarketPrices(p);
                                }}
                              >
                                {t.prevPage}
                              </button>
                            )}
                            {showPages.map((p, i) =>
                              p === "…" ? (
                                <span
                                  key={`ellipsis-${i}`}
                                  className="status-text"
                                  style={{ padding: "0 0.25rem" }}
                                >
                                  …
                                </span>
                              ) : (
                                <button
                                  key={p}
                                  type="button"
                                  className={
                                    marketPage === p
                                      ? "button-primary"
                                      : "button-secondary"
                                  }
                                  disabled={loadingMarket}
                                  onClick={() => void fetchMarketPrices(p)}
                                >
                                  {p}
                                </button>
                              ),
                            )}
                            {marketPage < totalPages && (
                              <button
                                type="button"
                                className="button-secondary"
                                disabled={loadingMarket}
                                onClick={() => {
                                  const p = marketPage + 1;
                                  if (p <= totalPages)
                                    void fetchMarketPrices(p);
                                }}
                              >
                                {t.nextPage}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                  </>
                )}
              </div>
            </div>
          </article>

          {selectedGameForSkins && (
            <>
              <p className="status-text" style={{ marginBottom: "0.35rem" }}>
                {t.yourInventory}
              </p>
              <div className="game-switcher" style={{ marginBottom: "1rem" }}>
                {TARGET_GAMES.map((g) => {
                  const isSelected = selectedGameForSkins.appid === g.appid;
                  return (
                    <button
                      key={g.appid}
                      type="button"
                      className={`game-switcher-button${isSelected ? " game-switcher-button--active" : ""}`}
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
              <article className="card" ref={inventorySectionRef}>
                <div className="card-inner">
                  <div className="card-header">
                    <div className="card-title-block">
                      <h2 className="card-title">{t.skinsGalleryTitle}</h2>
                      <p
                        className="card-kicker"
                        style={{ marginTop: "0.15rem", marginBottom: 0 }}
                      >
                        {selectedGameForSkins.name}
                      </p>
                      {/* <p className="card-kicker">{t.viewSwitcherHint}</p> */}
                    </div>
                  </div>
                  <div className="card-body">
                    {loadingInventories && !inventories[selectedGameForSkins.appid] && (
                      <p className="status-text" style={{ marginBottom: "0.75rem" }}>
                        {t.inventoryLoading}
                      </p>
                    )}
                    <div className="gallery-view" key={viewMode}>
                      {viewMode === "2D" ? (
                        <div className="skin-grid-2d">
                          {(() => {
                            const rawBase =
                              inventories[selectedGameForSkins.appid]?.items ??
                              [];
                            const realBase = rawBase.filter((item) => {
                              const desc = item.description || "";
                              const isMockItem =
                                (item as any).isMock ||
                                /no live Steam data/i.test(desc);
                              return !isMockItem;
                            });
                            const base = realBase.length ? realBase : [];
                            if (!base.length) {
                              const maxCards = 8;
                              const cards: SkinCard[] = [];
                              for (let i = 0; i < maxCards; i += 1) {
                                cards.push({
                                  name: `Skin #${i + 1}`,
                                  description: "",
                                  iconUrl: PLACEHOLDER_SKIN_IMAGE,
                                });
                              }
                              return cards;
                            }
                            const start =
                              (inventoryPage - 1) * INVENTORY_PAGE_SIZE;
                            const end = start + INVENTORY_PAGE_SIZE;
                            return base.slice(start, end);
                          })().map((skin, idx) => {
                            let displayName = skin.name;
                            const gameName = selectedGameForSkins.name;
                            if (gameName) {
                              displayName = displayName
                                .replace(
                                  new RegExp(
                                    `\\s*–\\s*${gameName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
                                    "gi",
                                  ),
                                  "",
                                )
                                .replace(
                                  new RegExp(
                                    `\\s*\\(\\s*${gameName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\)`,
                                    "gi",
                                  ),
                                  "",
                                )
                                .trim();
                            }
                            return (
                              <div
                                key={`${skin.name}-${idx}`}
                                style={{ position: "relative" }}
                              >
                                <button
                                  type="button"
                                  className="skin-card-2d"
                                onClick={() => openSkinModalFromInventory(skin)}
                                >
                                  <div className="skin-card-2d-image-wrap">
                                    <img
                                      src={getSkinImage(skin.name, {
                                        appId: selectedGameForSkins.appid,
                                        iconUrl: skin.iconUrl,
                                      })}
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src =
                                          PLACEHOLDER_SKIN_IMAGE;
                                      }}
                                      alt={displayName}
                                      className="skin-card-2d-image"
                                    />
                                  </div>
                                  <div className="skin-card-2d-footer">
                                    <div className="skin-card-2d-name">
                                      {displayName}
                                    </div>
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          className="canvas-shell"
                          style={{ padding: "0.75rem" }}
                        >
                          <WebGLCanvas
                            skins={(() => {
                              const rawBase =
                                inventories[selectedGameForSkins.appid]
                                  ?.items ?? [];
                              const realBase = rawBase.filter((item) => {
                                const desc = item.description || "";
                                const isMockItem =
                                  (item as any).isMock ||
                                  /no live Steam data/i.test(desc);
                                return !isMockItem;
                              });
                              const base = realBase.length ? realBase : [];
                              if (!base.length) {
                                const maxCards = 8;
                                const cards: SkinCard[] = [];
                                for (let i = 0; i < maxCards; i += 1) {
                                  cards.push({
                                    name: `Skin #${i + 1}`,
                                    description: "",
                                    iconUrl: PLACEHOLDER_SKIN_IMAGE,
                                  });
                                }
                                return cards;
                              }
                              const start =
                                (inventoryPage - 1) * INVENTORY_PAGE_SIZE;
                              const end = start + INVENTORY_PAGE_SIZE;
                              return base.slice(start, end);
                            })()}
                            onSkinSelect={setSelectedSkin}
                          />
                        </div>
                      )}
                    </div>

                    {(() => {
                      const rawBase =
                        inventories[selectedGameForSkins.appid]?.items ?? [];
                      const realBase = rawBase.filter((item) => {
                        const desc = item.description || "";
                        const isMockItem =
                          (item as any).isMock ||
                          /no live Steam data/i.test(desc);
                        return !isMockItem;
                      });
                      const total = realBase.length;
                      if (!total) return null;
                      const totalPages = Math.max(
                        1,
                        Math.ceil(total / INVENTORY_PAGE_SIZE),
                      );
                      if (totalPages <= 1) return null;

                      const pages: (number | "…")[] = [];
                      const maxButtons = 7;
                      if (totalPages <= maxButtons) {
                        for (let p = 1; p <= totalPages; p += 1) {
                          pages.push(p);
                        }
                      } else {
                        const addPage = (p: number | "…") => {
                          if (pages[pages.length - 1] !== p) pages.push(p);
                        };
                        addPage(1);
                        const start = Math.max(2, inventoryPage - 1);
                        const end = Math.min(totalPages - 1, inventoryPage + 1);
                        if (start > 2) addPage("…");
                        for (let p = start; p <= end; p += 1) addPage(p);
                        if (end < totalPages - 1) addPage("…");
                        addPage(totalPages);
                      }

                      return (
                        <div className="pagination-row">
                          <button
                            type="button"
                            className="button-secondary"
                            disabled={inventoryPage <= 1}
                            onClick={() =>
                              setInventoryPage((p) => Math.max(1, p - 1))
                            }
                          >
                            {t.prevPage}
                          </button>
                          {pages.map((p, idx) =>
                            p === "…" ? (
                              <span
                                key={`ellipsis-${idx}`}
                                className="status-text"
                                style={{ padding: "0 0.25rem" }}
                              >
                                …
                              </span>
                            ) : (
                              <button
                                key={p}
                                type="button"
                                className={
                                  inventoryPage === p
                                    ? "button-primary"
                                    : "button-secondary"
                                }
                                onClick={() => setInventoryPage(p)}
                              >
                                {p}
                              </button>
                            ),
                          )}
                          <button
                            type="button"
                            className="button-secondary"
                            disabled={inventoryPage >= totalPages}
                            onClick={() =>
                              setInventoryPage((p) =>
                                Math.min(totalPages, p + 1),
                              )
                            }
                          >
                            {t.nextPage}
                          </button>
                        </div>
                      );
                    })()}

                    {selectedSkin && (
                      <div
                        style={{
                          marginTop: "0.85rem",
                          fontSize: "0.85rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        <div style={{ fontWeight: 650 }}>
                          {selectedSkin.name}
                        </div>
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
            </>
          )}
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

      {skinModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120,
          }}
          onClick={() => setSkinModal(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 640, width: "100%", margin: "0 1rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-inner">
              <div
                className="card-header"
                style={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <div className="card-title-block">
                  <h2 className="card-title">
                    {skinModal.source === "market"
                      ? skinModal.item.marketHashName
                      : skinModal.item.name}
                  </h2>
                  {skinModal.source === "market" && (
                    <p className="card-kicker">
                      {skinModal.item.suggestedPrice != null
                        ? formatPrice(
                            skinModal.item.suggestedPrice,
                            marketCurrency,
                          )
                        : skinModal.item.minPrice != null
                          ? `${formatPrice(
                              skinModal.item.minPrice,
                              marketCurrency,
                            )} – ${
                              skinModal.item.maxPrice != null
                                ? formatPrice(
                                    skinModal.item.maxPrice,
                                    marketCurrency,
                                  )
                                : "?"
                            }`
                          : "—"}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="button-secondary"
                  onClick={() => setSkinModal(null)}
                >
                  ✕
                </button>
              </div>
              <div className="card-body">
                <div
                  className="view-switcher"
                  style={{ marginBottom: "0.75rem", justifyContent: "flex-start" }}
                >
                  <button
                    type="button"
                    className={`view-switcher-toggle${skinModalView === "2D" ? " view-switcher-toggle--active" : ""}`}
                    onClick={() => setSkinModalView("2D")}
                  >
                    <span className="view-switcher-icon">▦</span>
                    <span className="view-switcher-label">{t.view2D}</span>
                  </button>
                  <button
                    type="button"
                    className={`view-switcher-toggle${skinModalView === "3D" ? " view-switcher-toggle--active" : ""}`}
                    onClick={() => setSkinModalView("3D")}
                  >
                    <span className="view-switcher-icon">⬢</span>
                    <span className="view-switcher-label">{t.view3D}</span>
                  </button>
                </div>

                {skinModalView === "2D" ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div className="skin-card-2d" style={{ maxWidth: 260 }}>
                      <div className="skin-card-2d-image-wrap">
                        <img
                          src={getSkinImage(
                            skinModal.source === "market"
                              ? skinModal.item.marketHashName
                              : skinModal.item.name,
                            {
                              appId: skinModal.gameId,
                              iconUrl:
                                skinModal.source === "inventory"
                                  ? skinModal.item.iconUrl
                                  : undefined,
                            },
                          )}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = PLACEHOLDER_SKIN_IMAGE;
                          }}
                          alt={
                            skinModal.source === "market"
                              ? skinModal.item.marketHashName
                              : skinModal.item.name
                          }
                          className="skin-card-2d-image"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="canvas-shell"
                    style={{ padding: "0.75rem", minHeight: 260 }}
                  >
                    <WebGLCanvas
                      skins={[
                        skinModal.source === "market"
                          ? {
                              name: skinModal.item.marketHashName,
                              description: "",
                              iconUrl: getSkinImage(
                                skinModal.item.marketHashName,
                                { appId: skinModal.gameId },
                              ),
                            }
                          : skinModal.item,
                      ]}
                      maxCards={1}
                    />
                  </div>
                )}

                {skinModal?.source === "market" && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                        gap: "0.5rem",
                      }}
                    >
                      <span className="status-text">
                        {t.marketPrices} – history
                      </span>
                      <div
                        className="view-switcher"
                        style={{
                          padding: "0.15rem 0.2rem",
                          gap: "0.15rem",
                        }}
                      >
                        {[7, 30, 90].map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={`view-switcher-toggle${
                              historyRangeDays === d
                                ? " view-switcher-toggle--active"
                                : ""
                            }`}
                            style={{ padding: "0.1rem 0.55rem" }}
                            onClick={() => setHistoryRangeDays(d as 7 | 30 | 90)}
                          >
                            <span className="view-switcher-label">
                              {d}D
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {historyLoading && (
                      <p className="status-text">
                        {t.marketLoading}
                      </p>
                    )}
                    {!historyLoading &&
                      historyWarning === "unsupported-game" && (
                        <p className="status-text">
                          No historical data available.
                        </p>
                      )}
                    {!historyLoading &&
                      historyWarning !== "unsupported-game" &&
                      !historyPoints.length && (
                        <p className="status-text">
                          No historical data available.
                        </p>
                      )}
                    {!historyLoading && historyPoints.length > 0 && (
                      <PriceHistoryChart
                        points={historyPoints}
                        days={historyRangeDays}
                      />
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "0.75rem",
                  }}
                >
                  <button
                    type="button"
                    aria-label={t.addAlert}
                    className="button-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!skinModal) return;
                      const name =
                        skinModal.source === "market"
                          ? skinModal.item.marketHashName
                          : skinModal.item.name;
                      setAlertModal({
                        skin: {
                          name,
                          description: "",
                          iconUrl: "/assets/test-skin.png",
                        },
                        gameId: skinModal.gameId,
                      });
                      setAlertTargetPrice("");
                      setAlertCondition("below");
                      setSkinModal(null);
                    }}
                  >
                    {t.addAlert}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {alertModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => !alertSubmitting && setAlertModal(null)}
        >
          <div
            className="card"
            style={{ minWidth: 280, maxWidth: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-inner">
              <h2 className="card-title">{t.addAlert}</h2>
              <p className="card-kicker">{alertModal.skin.name}</p>
              <div
                className="card-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <label>
                  <span className="status-text">
                    {t.targetPriceLabel(CURRENCY_SYMBOLS[marketCurrency])}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: "100%",
                      marginTop: "0.25rem",
                      padding: "0.5rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                    }}
                  />
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className={`button-secondary${alertCondition === "below" ? " view-switcher-toggle--active" : ""}`}
                    onClick={() => setAlertCondition("below")}
                  >
                    {t.conditionBelow}
                  </button>
                  <button
                    type="button"
                    className={`button-secondary${alertCondition === "above" ? " view-switcher-toggle--active" : ""}`}
                    onClick={() => setAlertCondition("above")}
                  >
                    {t.conditionAbove}
                  </button>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => !alertSubmitting && setAlertModal(null)}
                    disabled={alertSubmitting}
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={submitAlert}
                    disabled={alertSubmitting || !alertTargetPrice.trim()}
                  >
                    {alertSubmitting ? "…" : t.addAlert}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="alert"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "0.75rem 1.25rem",
            background: "rgba(251, 191, 36, 0.95)",
            color: "#1e293b",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-soft)",
            zIndex: 101,
            fontWeight: 500,
          }}
        >
          {toast}
        </div>
      )}

      <footer className="footer-note">
        {/* <span>{t.footerLeft}</span> */}
        <span>{t.footerRight}</span>
      </footer>
    </div>
  );
};
