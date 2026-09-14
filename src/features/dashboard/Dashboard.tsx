"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ChartColumn,
  ChartNoAxesColumnIncreasing,
  ExternalLink,
  FileText,
  Bell,
  Moon,
  Plus,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Header from "../../components/Header";

type IconName = "chart" | "users" | "revenue" | "document" | "moon" | "bell";

type Accent = "blue" | "green" | "orange" | "pink" | "purple" | "cyan";

type Metric = {
  label: string;
  value: string;
  change: string;
  icon: IconName;
  color: Accent;
  bars?: BarHeight[];
  graph?: "active" | "revenue";
  danger?: boolean;
};

type BarHeight = 16 | 18 | 25 | 27 | 34 | 35 | 42;

type AccountCard = {
  shortTitle: string;
  fullTitle: string;
  description: string;
  color: Accent;
  route: string;
};

const THEME_STORAGE_KEY = "dashboard-theme";
const THEME_CHANGE_EVENT = "dashboard-theme-change";
const ACCOUNT_ORDER_STORAGE_KEY = "dashboard-account-order";
const ACCOUNT_ORDER_CHANGE_EVENT = "dashboard-account-order-change";
const CUSTOM_ACCOUNTS_STORAGE_KEY = "dashboard-custom-accounts";
const CUSTOM_ACCOUNTS_CHANGE_EVENT = "dashboard-custom-accounts-change";

// Subscribe to browser-tab changes and the custom event used by this app so
// the dashboard theme stays synchronized wherever it is changed.
function subscribeToTheme(onThemeChange: () => void) {
  window.addEventListener("storage", onThemeChange);
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);

  return () => {
    window.removeEventListener("storage", onThemeChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  };
}

function getThemeSnapshot() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme) {
    return storedTheme === "dark";
  }

  return document.cookie
    .split("; ")
    .some((cookie) => cookie === `${THEME_STORAGE_KEY}=dark`);
}

const iconMap: Record<IconName, LucideIcon> = {
  chart: ChartNoAxesColumnIncreasing,
  users: Users,
  revenue: ChartColumn,
  document: FileText,
  moon: Moon,
  bell: Bell,
};

const accentStyles: Record<
  Accent,
  { icon: string; border: string; frame: string; wave: string }
> = {
  blue: {
    icon: "bg-[#deebff] text-[#0967d9]",
    border: "after:bg-[#469eff]",
    frame: "border-[#469eff]",
    wave: "bg-[rgba(194,220,255,0.5)]",
  },
  green: {
    icon: "bg-[#dbf5ef] text-[#009b60]",
    border: "after:bg-[#00bd7a]",
    frame: "border-[#00bd7a]",
    wave: "bg-[#c5f0e2]",
  },
  orange: {
    icon: "bg-[#fff1d8] text-[#e99500]",
    border: "after:bg-[#ffbf4d]",
    frame: "border-[#ffbf4d]",
    wave: "bg-[#ffedc5]",
  },
  pink: {
    icon: "bg-[#ffe1e9] text-[#e80025]",
    border: "after:bg-[#ff7c9d]",
    frame: "border-[#ff7c9d]",
    wave: "bg-[#ffe0e8]",
  },
  purple: {
    icon: "bg-[#eee2ff] text-[#6200d5]",
    border: "after:bg-[#a570ff]",
    frame: "border-[#a570ff]",
    wave: "bg-[#eadbff]",
  },
  cyan: {
    icon: "bg-[#d6f6f8] text-[#008c9c]",
    border: "after:bg-[#21c4d8]",
    frame: "border-[#21c4d8]",
    wave: "bg-[#d3f3f5]",
  },
};

const barHeightClasses: Record<BarHeight, string> = {
  16: "h-4",
  18: "h-[18px]",
  25: "h-[25px]",
  27: "h-[27px]",
  34: "h-[34px]",
  35: "h-[35px]",
  42: "h-[42px]",
};

const metrics: Metric[] = [
  {
    label: "Total Employees",
    value: "185",
    change: "+4.2%",
    icon: "users",
    color: "blue",
    bars: [18, 27, 35],
  },
  {
    label: "Active Employees",
    value: "172",
    change: "+3.3%",
    icon: "users",
    color: "green",
    graph: "active",
  },
  {
    label: "Employees On Leave",
    value: "8",
    change: "+1.1%",
    icon: "document",
    color: "orange",
    bars: [16, 25, 34, 42],
  },
  {
    label: "Separated Employees",
    value: "5",
    change: "-12.5%",
    icon: "document",
    color: "pink",
    bars: [16, 25, 34, 42],
    danger: true,
  },
];

const accounts: AccountCard[] = [
  {
    shortTitle: "RM",
    fullTitle: "ROCKET MONEY",
    description: "Personal finance and subscription analytics.",
    color: "green",
    route: "/dashboard/rm",
  },
  {
    shortTitle: "BF",
    fullTitle: "BF EXPERIAN",
    description: "Credit insights and account monitoring.",
    color: "purple",
    route: "/dashboard/bf",
  },
  {
    shortTitle: "FLEX",
    fullTitle: "FLEXAR",
    description: "Flexible account performance analytics.",
    color: "cyan",
    route: "/dashboard/flex",
  },
];

const DEFAULT_ACCOUNT_ORDER = JSON.stringify(
  accounts.map((account) => account.shortTitle),
);

// Custom accounts are stored locally for now. This storage boundary keeps the
// UI ready to move to an API or database without changing the account flow.
function subscribeToCustomAccounts(onAccountsChange: () => void) {
  window.addEventListener("storage", onAccountsChange);
  window.addEventListener(CUSTOM_ACCOUNTS_CHANGE_EVENT, onAccountsChange);

  return () => {
    window.removeEventListener("storage", onAccountsChange);
    window.removeEventListener(CUSTOM_ACCOUNTS_CHANGE_EVENT, onAccountsChange);
  };
}

function getCustomAccountsSnapshot() {
  return window.localStorage.getItem(CUSTOM_ACCOUNTS_STORAGE_KEY) ?? "[]";
}

function getServerCustomAccountsSnapshot() {
  return "[]";
}

function parseCustomAccounts(snapshot: string) {
  try {
    const savedAccounts = JSON.parse(snapshot) as unknown;

    return Array.isArray(savedAccounts)
      ? savedAccounts.filter((account): account is AccountCard => {
          if (!account || typeof account !== "object") return false;

          const candidate = account as Record<string, unknown>;
          return (
            typeof candidate.shortTitle === "string" &&
            typeof candidate.fullTitle === "string" &&
            typeof candidate.description === "string" &&
            typeof candidate.route === "string" &&
            typeof candidate.color === "string"
          );
        })
      : [];
  } catch {
    return [];
  }
}

// Account order is stored separately so drag-and-drop reordering does not
// overwrite the account definitions themselves.
function subscribeToAccountOrder(onOrderChange: () => void) {
  window.addEventListener("storage", onOrderChange);
  window.addEventListener(ACCOUNT_ORDER_CHANGE_EVENT, onOrderChange);

  return () => {
    window.removeEventListener("storage", onOrderChange);
    window.removeEventListener(ACCOUNT_ORDER_CHANGE_EVENT, onOrderChange);
  };
}

function getAccountOrderSnapshot() {
  return (
    window.localStorage.getItem(ACCOUNT_ORDER_STORAGE_KEY) ??
    DEFAULT_ACCOUNT_ORDER
  );
}

function getServerAccountOrderSnapshot() {
  return DEFAULT_ACCOUNT_ORDER;
}

function resolveAccountOrder(snapshot: string, availableAccounts = accounts) {
  try {
    const savedOrder = JSON.parse(snapshot) as unknown;

    if (!Array.isArray(savedOrder)) {
      return availableAccounts;
    }

    const uniqueAccountIds = [
      ...new Set(
        savedOrder.filter((item): item is string => typeof item === "string"),
      ),
    ];

    return uniqueAccountIds
      .map((accountId) =>
        availableAccounts.find((account) => account.shortTitle === accountId),
      )
      .filter((account): account is AccountCard => Boolean(account));
  } catch {
    return availableAccounts;
  }
}

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const IconComponent = iconMap[name];

  return <IconComponent aria-hidden="true" size={size} />;
}

function MiniGraph({ metric }: { metric: Metric }) {
  if (metric.bars) {
    return (
      <div className="relative z-20 mb-3 ml-auto hidden h-[46px] items-end gap-[5px] self-end sm:flex">
        {metric.bars.map((height, index) => (
          <i
            className={`block w-[9px] rounded-t-[3px] ${barHeightClasses[height]} ${
              metric.danger ? "bg-[#f4a8c5]" : "bg-[#a6cdfc]"
            }`}
            key={index}
          />
        ))}
      </div>
    );
  }

  const revenue = metric.graph === "revenue";

  return (
    <svg
      aria-hidden="true"
      className="relative z-20 ml-auto mt-[30px] hidden h-[45px] w-[76px] sm:block"
      viewBox="0 0 76 45"
      preserveAspectRatio="none"
    >
      <path
        d="M1 36 13 25 23 30 35 16 44 21 56 8 65 15 75 2V43H1Z"
        fill={revenue ? "#fff4df" : "#d8f3ed"}
      />
      <polyline
        points="1,36 13,25 23,30 35,16 44,21 56,8 65,15 75,2"
        fill="none"
        stroke={revenue ? "#f5a000" : "#00a65d"}
        strokeWidth="2"
      />
    </svg>
  );
}

type DashboardProps = {
  initialDarkMode?: boolean;
};

export default function Dashboard({ initialDarkMode = false }: DashboardProps) {
  const router = useRouter();
  const darkMode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => initialDarkMode,
  );
  const accountOrderSnapshot = useSyncExternalStore(
    subscribeToAccountOrder,
    getAccountOrderSnapshot,
    getServerAccountOrderSnapshot,
  );
  const customAccountsSnapshot = useSyncExternalStore(
    subscribeToCustomAccounts,
    getCustomAccountsSnapshot,
    getServerCustomAccountsSnapshot,
  );
  const availableAccounts = [
    ...accounts,
    ...parseCustomAccounts(customAccountsSnapshot),
  ];
  const orderedAccounts = resolveAccountOrder(
    accountOrderSnapshot,
    availableAccounts,
  );
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [dropExpanded, setDropExpanded] = useState(false);
  const [dropOrigin, setDropOrigin] = useState({ x: 0, y: 0 });
  const [transitionAccount, setTransitionAccount] =
    useState<AccountCard | null>(null);
  const [draggingAccount, setDraggingAccount] = useState<AccountCard | null>(
    null,
  );
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [trashActive, setTrashActive] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const activePointerRef = useRef<number | null>(null);
  const lastSwapTargetRef = useRef<string | null>(null);
  const suppressCardClickRef = useRef(false);

  const saveAccountOrder = (nextAccounts: AccountCard[]) => {
    window.localStorage.setItem(
      ACCOUNT_ORDER_STORAGE_KEY,
      JSON.stringify(nextAccounts.map((account) => account.shortTitle)),
    );
    window.dispatchEvent(new Event(ACCOUNT_ORDER_CHANGE_EVENT));
  };

  const createAccount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullTitle = String(formData.get("accountName") ?? "").trim();
    const accountType = String(formData.get("accountType") ?? "Business");

    if (!fullTitle) return;

    const baseSlug =
      fullTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "account";
    const existingSlugs = new Set(
      availableAccounts.map((account) => account.route.split("/").pop()),
    );
    let slug = baseSlug;
    let suffix = 2;
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const newAccount: AccountCard = {
      shortTitle: fullTitle.slice(0, 5).toUpperCase(),
      fullTitle,
      description: `${accountType} account analytics and monitoring.`,
      color: "blue",
      route: `/dashboard/accounts/${slug}`,
    };

    // Persist the definition before updating the order so the new card can be
    // resolved when the order-change event is received.
    const nextCustomAccounts = [
      ...parseCustomAccounts(customAccountsSnapshot),
      newAccount,
    ];
    window.localStorage.setItem(
      CUSTOM_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(nextCustomAccounts),
    );
    window.dispatchEvent(new Event(CUSTOM_ACCOUNTS_CHANGE_EVENT));
    saveAccountOrder([...orderedAccounts, newAccount]);
    setAddAccountOpen(false);
    event.currentTarget.reset();
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startAccountHold = (
    event: ReactPointerEvent<HTMLButtonElement>,
    account: AccountCard,
  ) => {
    if (event.button !== 0 || transitionOpen) {
      return;
    }

    clearLongPressTimer();
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    activePointerRef.current = event.pointerId;

    const cardElement = event.currentTarget;
    const pointerId = event.pointerId;
    const initialPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      if (cardElement.isConnected) {
        cardElement.setPointerCapture(pointerId);
      }

      suppressCardClickRef.current = true;
      setDraggingAccount(account);
      setDragPosition(initialPosition);
      longPressTimerRef.current = null;
    }, 500);
  };

  const moveAccount = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) {
      return;
    }

    if (!draggingAccount) {
      const movedDistance = Math.hypot(
        event.clientX - pointerStartRef.current.x,
        event.clientY - pointerStartRef.current.y,
      );

      if (movedDistance > 10) {
        clearLongPressTimer();
      }

      return;
    }

    event.preventDefault();
    setDragPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const pointerTarget = document.elementFromPoint(
      event.clientX,
      event.clientY,
    );
    const overTrash = Boolean(pointerTarget?.closest("[data-trash-zone]"));

    setTrashActive(overTrash);

    if (overTrash) {
      return;
    }

    const targetCard = pointerTarget?.closest<HTMLElement>(
      "[data-account-card]",
    );
    const targetAccountId = targetCard?.dataset.accountId;

    if (
      !targetAccountId ||
      targetAccountId === draggingAccount.shortTitle ||
      lastSwapTargetRef.current === targetAccountId
    ) {
      return;
    }

    const nextAccounts = [...orderedAccounts];
    const draggedIndex = nextAccounts.findIndex(
      (account) => account.shortTitle === draggingAccount.shortTitle,
    );
    const targetIndex = nextAccounts.findIndex(
      (account) => account.shortTitle === targetAccountId,
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const [draggedCard] = nextAccounts.splice(draggedIndex, 1);
    nextAccounts.splice(targetIndex, 0, draggedCard);
    lastSwapTargetRef.current = targetAccountId;
    saveAccountOrder(nextAccounts);
  };

  const finishAccountDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) => {
    clearLongPressTimer();

    if (activePointerRef.current !== event.pointerId) {
      return;
    }

    if (draggingAccount) {
      if (trashActive && !cancelled) {
        saveAccountOrder(
          orderedAccounts.filter(
            (account) => account.shortTitle !== draggingAccount.shortTitle,
          ),
        );
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      setDraggingAccount(null);
      setTrashActive(false);
      lastSwapTargetRef.current = null;

      window.setTimeout(() => {
        suppressCardClickRef.current = false;
      }, 0);
    }

    activePointerRef.current = null;
  };

  const openAccount = (
    event: MouseEvent<HTMLButtonElement>,
    account: AccountCard,
  ) => {
    if (transitionOpen) {
      return;
    }

    const cardBounds = event.currentTarget.getBoundingClientRect();
    const origin = {
      x: cardBounds.left + cardBounds.width / 2,
      y: cardBounds.top + cardBounds.height / 2,
    };

    setDropOrigin(origin);
    setTransitionAccount(account);
    setTransitionOpen(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDropExpanded(true));
    });

    window.setTimeout(() => {
      router.push(account.route);
    }, 1100);
  };

  return (
    <main
      className={`min-h-screen overflow-hidden ${
        darkMode ? "bg-[#101c39]" : "bg-white"
      }`}
    >
      <section
        className={`relative rounded-b-[23px] px-3.5 py-3.5 text-white transition-colors duration-300 sm:px-8 sm:py-6 xl:px-12 xl:pt-[30px] xl:pb-[34px] ${
          darkMode
            ? "bg-[radial-gradient(circle_at_72%_-45%,#263a63_0_19%,transparent_40%),linear-gradient(119deg,#101c39_0%,#152442_51%,#1d3156_100%)]"
            : "bg-[radial-gradient(circle_at_72%_-45%,#44bdf6_0_19%,transparent_40%),linear-gradient(119deg,#0d70dc_0%,#137ddd_51%,#48bbf5_100%)]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[23px]">
          <div className="absolute -top-32 -left-24 h-80 w-80 animate-pulse rounded-full bg-sky-200/15 blur-3xl [animation-duration:7s] motion-reduce:animate-none" />
          <div className="absolute top-5 left-[25%] h-px w-44 -rotate-6 animate-pulse bg-gradient-to-r from-transparent via-white/35 to-transparent [animation-duration:4s] motion-reduce:animate-none" />
          <div className="absolute top-12 left-[12%] h-2.5 w-2.5 animate-pulse rounded-full bg-white/35 shadow-[0_0_18px_6px_rgba(255,255,255,0.12)] [animation-delay:1s] [animation-duration:3.5s] motion-reduce:animate-none" />
          <div className="absolute top-7 left-[55%] h-1.5 w-1.5 animate-ping rounded-full bg-cyan-100/55 [animation-delay:0.7s] [animation-duration:4.5s] motion-reduce:animate-none" />
          <div className="absolute top-[72px] left-[63%] h-1 w-1 animate-ping rounded-full bg-white/50 [animation-delay:2s] [animation-duration:5s] motion-reduce:animate-none" />
          <div className="absolute -top-20 right-[18%] h-40 w-72 rotate-12 rounded-[50%] border-b border-white/15 bg-gradient-to-b from-white/[0.06] to-transparent" />
          <div
            className={`absolute top-[-316px] right-[33%] h-[500px] w-[500px] rounded-full transition-colors duration-300 ${
              darkMode ? "bg-[#263a5d]/55" : "bg-[rgba(71,192,248,0.32)]"
            }`}
          />
          <div className="absolute -top-28 -right-20 h-80 w-80 rounded-full border-[46px] border-white/[0.06]" />
          <div className="absolute -top-9 right-[7%] h-52 w-52 rounded-full border border-white/15" />
          <div className="absolute -bottom-36 left-[18%] h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />
          <div className="absolute top-[18%] right-[16%] h-32 w-56 -rotate-12 rounded-[32px] border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
          <div className="absolute top-0 right-0 h-full w-[55%] bg-[radial-gradient(circle,rgba(255,255,255,0.35)_1px,transparent_1.5px)] bg-[length:20px_20px] opacity-20 [mask-image:linear-gradient(to_left,black,transparent_82%)]" />
          <div className="absolute right-[2%] bottom-10 h-px w-[32%] rotate-[-8deg] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute right-[8%] bottom-5 h-px w-[24%] rotate-[-8deg] bg-gradient-to-r from-transparent via-cyan-100/25 to-transparent" />
          <div className="absolute -bottom-24 -left-[10%] h-44 w-[120%] animate-[bounce_8s_ease-in-out_infinite] rounded-[48%] border-t-2 border-white/20 bg-white/[0.035] will-change-transform motion-reduce:animate-none" />
          <div className="absolute -bottom-28 -left-[6%] h-48 w-[112%] animate-[bounce_11s_ease-in-out_infinite] rounded-[52%] border-t border-cyan-100/25 bg-cyan-200/[0.035] [animation-delay:-4s] will-change-transform motion-reduce:animate-none" />
          <div className="absolute right-[28%] bottom-[18%] h-2 w-2 animate-ping rounded-full bg-white/45 [animation-duration:3s] motion-reduce:animate-none" />
          <div className="absolute right-[12%] bottom-[30%] h-1.5 w-1.5 animate-ping rounded-full bg-cyan-100/50 [animation-delay:1.5s] [animation-duration:4s] motion-reduce:animate-none" />
        </div>

        <Header initialDarkMode={initialDarkMode} />

        <div className="relative z-[1] mt-[22px] items-end justify-between sm:mt-4 sm:flex">
          <div>
            <h1 className="mb-[7px] text-[33px] leading-[1.05] font-bold sm:text-[38px]">
              Dashboard
            </h1>
            <p className="text-[15px] leading-[1.4] text-[#f2f8ff] sm:text-[17px]">
              Welcome back! Here&apos;s an overview of your workforce analytics across all accounts.
            </p>
          </div>
          <button
            className={`mt-[17px] flex w-full items-center justify-center rounded-xl border px-[27px] py-[13px] text-base font-bold shadow-[0_4px_12px_#1258a31c] transition-colors sm:mt-0 sm:w-auto sm:min-w-[194px] ${
              darkMode
                ? "border-white/15 bg-[#172746] text-white"
                : "border-transparent bg-white text-[#0767e8]"
            }`}
            onClick={() => setAddAccountOpen(true)}
          >
            <Plus aria-hidden="true" className="mr-[9px]" size={15} />
            Add Account
          </button>
        </div>

        <div className="relative z-[1] mt-8 grid grid-cols-2 gap-2.5 md:gap-5 lg:grid-cols-4 xl:gap-[26px]">
          {metrics.map((metric) => (
            <article
              className={`relative flex h-28 items-center overflow-hidden rounded-[10px] border p-2.5 transition-colors sm:h-[121px] sm:px-[15px] sm:py-3 ${
                darkMode
                  ? "border-[#2a3b5c] bg-[linear-gradient(110deg,#182746,#14213d)] text-[#edf4ff]"
                  : "border-transparent bg-[linear-gradient(110deg,#fff,#f1f6fb)] text-[#0e1838]"
              }`}
              key={metric.label}
            >
              <div
                className={`relative z-20 grid h-[47px] w-[47px] shrink-0 place-items-center rounded-full sm:h-[61px] sm:w-[61px] ${accentStyles[metric.color].icon}`}
              >
                <Icon name={metric.icon} size={32} />
              </div>
              <div className="relative z-20 ml-2.5 sm:ml-[25px]">
                <div
                  className={`mb-[5px] text-[11px] sm:text-sm ${
                    darkMode ? "text-[#aabbd5]" : "text-[#52698e]"
                  }`}
                >
                  {metric.label}
                </div>
                <div className="text-xl leading-none font-bold sm:text-[26px]">
                  {metric.value}
                </div>
                <div
                  className={`mt-[9px] flex items-center gap-[5px] text-[11px] font-bold sm:text-sm ${
                    metric.danger ? "text-[#e10025]" : "text-[#039a3d]"
                  }`}
                >
                  <TrendingUp aria-hidden="true" size={12} />
                  {metric.change}
                </div>
                <div
                  className={`mt-0.5 text-[11px] sm:text-[13px] ${
                    darkMode ? "text-[#aabbd5]" : "text-[#52698e]"
                  }`}
                >
                  vs last month
                </div>
              </div>
              <MiniGraph metric={metric} />
            </article>
          ))}
        </div>
      </section>

      <section
        className={`px-3.5 pt-6 pb-11 sm:px-8 sm:pt-8 sm:pb-[72px] xl:px-12 xl:pt-[42px] xl:pb-[90px] ${
          darkMode ? "bg-[#101c39] text-[#edf4ff]" : "bg-white text-[#0e1838]"
        }`}
      >
        <div className="flex items-end justify-between">
          <div>
            <span className="mb-[7px] block text-[10px] font-bold tracking-[1.8px] text-[#2578df]">
              ACCOUNT PORTFOLIO
            </span>
            <h2 className="mb-1 text-xl font-bold sm:text-[23px]">
              Available Account Cards
            </h2>
            <p
              className={`text-[13px] sm:text-[15px] ${
                darkMode ? "text-[#9db2d0]" : "text-[#5c7197]"
              }`}
            >
              Hover to preview, or hold for 0.5 seconds to arrange accounts.
            </p>
          </div>
          <span
            className={`hidden items-center gap-[7px] text-xs sm:inline-flex ${
              darkMode ? "text-[#aabbd5]" : "text-[#6b7f9e]"
            }`}
          >
            {orderedAccounts.length} accounts
            <ExternalLink aria-hidden="true" size={12} color="#1975df" />
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-[11px] md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-x-6 xl:gap-y-[26px]">
          {orderedAccounts.map((account) => {
            const accent = accentStyles[account.color];
            const isDragging =
              draggingAccount?.shortTitle === account.shortTitle;

            return (
              <button
                type="button"
                data-account-card
                data-account-id={account.shortTitle}
                aria-grabbed={isDragging}
                className={`group relative flex h-[120px] select-none items-center overflow-hidden rounded-[10px] border p-[15px] text-left shadow-[0_3px_11px_#183a7210] transition-all duration-500 ease-in-out after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:opacity-0 after:transition-opacity after:duration-500 after:content-[''] hover:z-20 hover:scale-[1.06] hover:rounded-none hover:shadow-[0_16px_35px_#183a7230] hover:after:opacity-100 motion-reduce:hover:scale-100 sm:h-[150px] ${accent.border} ${
                  darkMode
                    ? "border-[#2a3b5c] bg-[#182746] text-[#edf4ff] hover:bg-[linear-gradient(110deg,#182746,#14213d)]"
                    : "border-[#e7edf5] bg-white text-[#0e1838] hover:bg-[linear-gradient(110deg,#fff_15%,#f9fbfe)]"
                } ${
                  draggingAccount ? "touch-none" : "touch-pan-y"
                } ${isDragging ? "scale-95 opacity-25" : ""}`}
                key={account.shortTitle}
                onClick={(event) => {
                  if (suppressCardClickRef.current) {
                    event.preventDefault();
                    return;
                  }

                  openAccount(event, account);
                }}
                onPointerDown={(event) => startAccountHold(event, account)}
                onPointerMove={moveAccount}
                onPointerUp={(event) => finishAccountDrag(event)}
                onPointerCancel={(event) => finishAccountDrag(event, true)}
                onPointerLeave={() => {
                  if (!draggingAccount) {
                    clearLongPressTimer();
                  }
                }}
                onContextMenu={(event) => event.preventDefault()}
              >
                <span className="absolute inset-0 z-30 grid place-items-center text-2xl font-black tracking-[0.18em] transition-all duration-500 ease-in-out group-hover:scale-75 group-hover:opacity-0 sm:text-[28px]">
                  {account.shortTitle}
                </span>
                <div
                  className={`pointer-events-none absolute inset-0 z-10 rotate-[10deg] border-2 opacity-0 transition-all duration-500 ease-in-out group-hover:inset-2.5 group-hover:rotate-0 group-hover:opacity-100 ${accent.frame}`}
                />
                <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.08)_1px,transparent_1px)] bg-[size:18px_18px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div
                  className={`pointer-events-none absolute -top-20 -right-14 z-[3] h-44 w-44 scale-50 rounded-full opacity-0 blur-2xl transition-all duration-700 group-hover:scale-100 group-hover:opacity-70 ${accent.wave}`}
                />
                <div
                  className={`pointer-events-none absolute -bottom-16 -left-12 z-[3] h-36 w-36 scale-50 rounded-full opacity-0 blur-xl transition-all delay-75 duration-700 group-hover:scale-100 group-hover:opacity-60 ${accent.wave}`}
                />
                <div
                  className={`pointer-events-none absolute top-1/2 left-1/2 z-[4] h-24 w-24 -translate-x-1/2 -translate-y-1/2 scale-50 rounded-full border opacity-0 transition-all duration-700 group-hover:scale-100 group-hover:opacity-40 ${accent.frame}`}
                />
                <div
                  className={`pointer-events-none absolute top-1/2 left-1/2 z-[4] h-36 w-36 -translate-x-1/2 -translate-y-1/2 scale-50 rounded-full border opacity-0 transition-all delay-75 duration-700 group-hover:scale-100 group-hover:opacity-20 ${accent.frame}`}
                />
                <div className="pointer-events-none absolute inset-y-0 -left-1/2 z-[15] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/65 to-transparent opacity-0 transition-all duration-1000 ease-in-out group-hover:left-[135%] group-hover:opacity-100" />
                <div className="pointer-events-none absolute inset-0 z-20 flex translate-y-3 flex-col items-center justify-center px-8 text-center opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <h3 className="mb-[7px] text-sm font-bold">
                    {account.fullTitle}
                  </h3>
                  <p
                    className={`max-w-[200px] text-[13px] leading-[1.35] sm:max-w-[155px] ${
                      darkMode ? "text-[#aabbd5]" : "text-[#4d668e]"
                    }`}
                  >
                    {account.description}
                  </p>
                </div>
                <span className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-[7px] font-bold tracking-[0.8em] opacity-0 transition-all delay-200 duration-500 group-hover:tracking-[0.35em] group-hover:opacity-60">
                  ACCOUNT ANALYTICS
                </span>
                <div
                  className={`absolute right-[-5px] bottom-[-29px] h-[55px] w-[70%] -rotate-[8deg] rounded-tl-[50%] opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${accent.wave}`}
                />
              </button>
            );
          })}

          {orderedAccounts.length === 0 && (
            <div
              className={`col-span-full rounded-xl border border-dashed px-6 py-14 text-center text-sm ${
                darkMode
                  ? "border-[#35486a] text-[#aabbd5]"
                  : "border-[#ccd7e5] text-[#637697]"
              }`}
            >
              No account cards available.
            </div>
          )}
        </div>
      </section>

      {addAccountOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#05143275] p-5 backdrop-blur-sm"
          onClick={() => setAddAccountOpen(false)}
        >
          <div
            className="relative w-full max-w-[430px] rounded-[18px] bg-white p-[27px] text-[#152143] shadow-[0_20px_60px_#05143245]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute top-[13px] right-[17px] grid h-[34px] w-[34px] place-items-center bg-transparent text-[#71809c]"
              aria-label="Close"
              onClick={() => setAddAccountOpen(false)}
            >
              <X aria-hidden="true" size={18} />
            </button>
            <div className="grid h-[52px] w-[52px] place-items-center rounded-[15px] bg-[#e1efff] text-[#0a6dde]">
              <Users aria-hidden="true" size={28} />
            </div>
            <h2 className="mt-[18px] mb-[5px] text-[22px] font-bold">
              Add a new account
            </h2>
            <p className="mb-[21px] text-[13px] text-[#617291]">
              Create an account profile to start tracking analytics.
            </p>
            <form onSubmit={createAccount}>
              <label className="mt-3.5 block text-xs font-bold text-[#415578]">
                Account name
                <input
                  required
                  name="accountName"
                  className="mt-[7px] block w-full rounded-[9px] border border-[#dce5f0] bg-[#fbfdff] px-3 py-[11px] text-[#17213b] outline-none focus:border-[#2081ed] focus:ring-3 focus:ring-[#2081ed1c]"
                  placeholder="e.g. Acme Corporation"
                />
              </label>
              <label className="mt-3.5 block text-xs font-bold text-[#415578]">
                Account type
                <select
                  name="accountType"
                  className="mt-[7px] block w-full rounded-[9px] border border-[#dce5f0] bg-[#fbfdff] px-3 py-[11px] text-[#17213b] outline-none focus:border-[#2081ed] focus:ring-3 focus:ring-[#2081ed1c]"
                  defaultValue="Business"
                >
                  <option>Business</option>
                  <option>Enterprise</option>
                  <option>Personal</option>
                </select>
              </label>
              <div className="mt-[25px] flex justify-end gap-2.5">
                <button
                  type="button"
                  className="rounded-lg bg-[#edf2f8] px-[15px] py-2.5 text-[13px] font-bold text-[#536685]"
                  onClick={() => setAddAccountOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0b73e7] px-[15px] py-2.5 text-[13px] font-bold text-white shadow-[0_5px_12px_#0b73e733]"
                >
                  Create account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {draggingAccount && (
        <>
          <div
            className={`pointer-events-none fixed z-[220] flex h-24 w-52 -translate-x-1/2 -translate-y-1/2 rotate-2 flex-col items-center justify-center rounded-2xl border shadow-[0_22px_55px_rgba(0,0,0,0.35)] ${
              darkMode
                ? "border-white/20 bg-[#182746] text-white"
                : "border-slate-200 bg-white text-[#0e1838]"
            }`}
            style={{
              left: dragPosition.x,
              top: dragPosition.y,
            }}
          >
            <strong className="text-2xl tracking-[0.16em]">
              {draggingAccount.shortTitle}
            </strong>
            <span className="mt-2 text-[10px] font-semibold tracking-[0.16em] opacity-60">
              {draggingAccount.fullTitle}
            </span>
          </div>

          <footer
            data-trash-zone
            className={`fixed inset-x-0 bottom-0 z-[210] flex h-24 items-end justify-center bg-gradient-to-t pb-3 pt-6 text-white transition-colors duration-200 ${
              trashActive
                ? "from-red-800/40 via-red-600/35 to-transparent"
                : "from-red-700/30 via-red-600/25 to-transparent"
            }`}
          >
            <div
              className={`flex flex-col items-center transition-transform duration-200 ${
                trashActive ? "scale-125" : "scale-100"
              }`}
            >
              <span
                className={`grid h-14 w-14 place-items-center rounded-full border-2 transition-colors ${
                  trashActive
                    ? "border-white bg-white text-red-600"
                    : "border-white/60 bg-red-600/20 text-white"
                }`}
              >
                <Trash2 aria-hidden="true" size={27} />
              </span>
              <span className="mt-2 text-xs font-bold tracking-[0.14em]">
                {trashActive ? "RELEASE TO REMOVE" : "DRAG HERE TO REMOVE"}
              </span>
            </div>
          </footer>
        </>
      )}

      {transitionOpen && (
        <div
          className="fixed inset-0 z-[200] overflow-hidden"
          role="status"
          aria-live="polite"
          aria-label={`Opening ${transitionAccount?.fullTitle ?? "account"}`}
        >
          <div
            className={`absolute h-[12vmax] w-[12vmax] -translate-x-1/2 -translate-y-1/2 rounded-[52%_48%_44%_56%] transition-transform duration-1000 ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform ${
              darkMode ? "bg-[#101c39]" : "bg-white"
            } ${dropExpanded ? "scale-[24]" : "scale-0"}`}
            style={{
              left: dropOrigin.x,
              top: dropOrigin.y,
            }}
          />
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-all delay-500 duration-300 ${
              darkMode ? "text-white" : "text-black"
            } ${
              dropExpanded
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0"
            }`}
          >
            <span className="text-4xl font-black tracking-[0.2em]">
              {transitionAccount?.shortTitle}
            </span>
            <span
              className={`mt-3 text-xs font-semibold tracking-[0.3em] ${
                darkMode ? "text-white/70" : "text-black/60"
              }`}
            >
              OPENING {transitionAccount?.fullTitle}
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
