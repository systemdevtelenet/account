"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Trash2,
} from "lucide-react";
import Header from "../../components/Header";
import WorkforceOverview, { type OverviewPeriod } from "./WorkforceOverview";
import useDashboardAccounts, { type AccountCard } from "./useDashboardAccounts";
import useDashboardTheme from "./useDashboardTheme";
import {
  getAccountSearchSnapshot,
  getServerAccountSearchSnapshot,
  subscribeToAccountSearch,
} from "../../lib/account-search";
import { getCurrentWorkforceAnchor, shiftWorkforceAnchor } from "../../lib/workforce-chart-range";

type DashboardProps = {
  initialDarkMode?: boolean;
};

export default function Dashboard({ initialDarkMode = false }: DashboardProps) {
  const router = useRouter();
  // The server uses the cookie snapshot; the client follows local storage and theme events.
  const darkMode = useDashboardTheme(initialDarkMode);
  const accountSearch = useSyncExternalStore(
    subscribeToAccountSearch,
    getAccountSearchSnapshot,
    getServerAccountSearchSnapshot,
  );
  const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>("Year");
  const [overviewAnchor, setOverviewAnchor] = useState(() => getCurrentWorkforceAnchor("Year"));
  const {
    orderedAccounts,
    summary,
    loading,
    error,
    hiddenCount,
    saveOrder,
    hideAccount,
    restoreAccounts,
  } = useDashboardAccounts(overviewPeriod, overviewAnchor);
  const searchTerm = accountSearch.trim().toLowerCase();
  const visibleAccounts = searchTerm
    ? orderedAccounts.filter((account) =>
        `${account.shortTitle} ${account.fullTitle}`.toLowerCase().includes(searchTerm))
    : orderedAccounts;
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

    // A hold distinguishes reorder intent from the card's normal open action.
    longPressTimerRef.current = window.setTimeout(() => {
      if (cardElement.isConnected) {
        // Capture the pointer so dragging continues after it leaves the card.
        cardElement.setPointerCapture(pointerId);
      }

      // Suppress the click generated at the end of the hold or drag gesture.
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
      // Cancel a pending hold when the pointer movement is likely a normal scroll.
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

    // Process each hovered card once, avoiding repeated reorders while the pointer rests.
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
    saveOrder(nextAccounts);
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
      // Remove only after a completed drop in the trash zone; cancellations keep the card.
      if (trashActive && !cancelled) {
        // Persist the removal separately; the order snapshot cannot represent
        // hidden accounts because it re-appends anything it does not contain.
        hideAccount(draggingAccount.shortTitle);
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

    // Start the transition at the selected card so the route change follows its animation.
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

    // Let the expansion finish before changing to the account route.
    window.setTimeout(() => {
      router.push(account.route);
    }, 1100);
  };

  return (
    <main className="dashboard-home min-h-screen">
      {/* Hide the header beneath the full-screen route transition. */}
      {!transitionOpen && <Header initialDarkMode={initialDarkMode} />}

      <section className="dashboard-intro px-4 pt-28 pb-6 sm:px-6 sm:pt-32 sm:pb-8 xl:px-8">
        <div className="dashboard-container dashboard-heading">
          <div>
            <h1 className="text-[30px] leading-tight font-bold sm:text-[38px]">
              Dashboard
            </h1>
            <p className="mt-1 text-sm leading-relaxed sm:text-base">
              Workforce activity across Operation System.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="workforce-analytics-heading"
        className="dashboard-analytics px-4 pb-8 sm:px-6 sm:pb-10 xl:px-8"
      >
        <div className="dashboard-container">
          <WorkforceOverview
            darkMode={darkMode}
            period={overviewPeriod}
            onPeriodChange={(period) => {
              setOverviewPeriod(period);
              setOverviewAnchor(getCurrentWorkforceAnchor(period));
            }}
            anchorDate={overviewAnchor}
            onNavigate={(amount) => setOverviewAnchor((anchor) => shiftWorkforceAnchor(overviewPeriod, anchor, amount))}
            data={summary}
            loading={loading}
            error={error}
          />
        </div>
      </section>

      <section
        className="dashboard-accounts-section px-4 pt-8 pb-16 sm:px-6 sm:pt-10 xl:px-8"
      >
        <div className="dashboard-container">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mb-1 text-xl font-bold sm:text-[23px]">
              Your accounts
            </h2>
            <p className="dashboard-analytics-muted text-[13px] sm:text-sm">
              Open an account to review its workforce activity. Hold and drag to arrange cards.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={restoreAccounts}
                className="dashboard-account-count rounded-full px-3 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                Restore {hiddenCount} hidden account{hiddenCount === 1 ? "" : "s"}
              </button>
            )}
            <span className="dashboard-account-count rounded-full px-3 py-1 text-xs font-semibold">
              {loading ? "Loading accounts…" : error ? "Accounts unavailable" : `${visibleAccounts.length} accounts`}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visibleAccounts.map((account) => {
            const isDragging =
              draggingAccount?.shortTitle === account.shortTitle;

            return (
              <button
                type="button"
                data-account-card
                data-account-id={account.shortTitle}
                aria-label={`${account.fullTitle}, ${account.totalEmployees} currently assigned employees. Open account. Hold and drag to arrange or remove.`}
                aria-grabbed={isDragging}
                className={`dashboard-account-card group relative flex min-h-[144px] w-full select-none flex-col justify-between overflow-hidden whitespace-nowrap border px-4 py-4 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] sm:px-5 ${draggingAccount ? "touch-none" : "touch-pan-y"
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
                <span className="relative z-10 flex w-full items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{account.fullTitle}</span>
                  <ArrowRight aria-hidden="true" className="dashboard-account-arrow shrink-0 transition-transform group-hover:translate-x-1" size={17} />
                </span>
                <span className="relative z-10 mt-3 block">
                  <span className="dashboard-analytics-muted block text-xs font-medium">Assigned</span>
                  <span className="mt-1 flex items-baseline gap-2">
                    <strong className="text-[26px] font-semibold leading-none tabular-nums sm:text-[30px]">
                      {account.totalEmployees}
                    </strong>
                    <span className="dashboard-analytics-muted text-xs">{account.activeEmployees} active</span>
                  </span>
                </span>
              </button>
            );
          })}

          {visibleAccounts.length === 0 && (
            <div
              className={`col-span-full rounded-xl border border-dashed px-6 py-14 text-center text-sm ${darkMode
                  ? "border-[var(--color-rule-deep)] text-[var(--color-muted-dark)]"
                  : "border-[var(--color-rule-empty)] text-[var(--color-muted-empty)]"
                }`}
            >
              {error
                ? "Account data could not be loaded. Refresh the page to try again."
                : loading
                  ? "Loading accounts from the database…"
                  : searchTerm
                    ? "No accounts match your search."
                    : "No active accounts were found."}
            </div>
          )}
        </div>
        </div>
      </section>

      {draggingAccount && (
        <>
          <div
            className={`pointer-events-none fixed z-[220] flex h-24 w-52 -translate-x-1/2 -translate-y-1/2 rotate-2 flex-col items-center justify-center rounded-2xl border shadow-[0_22px_55px_var(--color-drag-shadow)] ${darkMode
                ? "border-white/20 bg-[var(--color-ink-strong)] text-white"
                : "border-[var(--color-rule-soft-2)] bg-white text-[var(--color-ink-deep)]"
              }`}
            style={{
              left: dragPosition.x,
              top: dragPosition.y,
            }}
          >
            <strong className="text-2xl tracking-[0.16em]">
              {draggingAccount.shortTitle}
            </strong>
            <span className="mt-2 text-xs font-medium opacity-60">
              {draggingAccount.fullTitle}
            </span>
          </div>

          <footer
            data-trash-zone
            className={`fixed inset-x-0 bottom-0 z-[210] flex h-24 items-end justify-center bg-gradient-to-t pb-3 pt-6 text-white transition-colors duration-200 ${trashActive
                ? "from-[var(--color-trash-active-from)] via-[var(--color-trash-active-via)] to-transparent"
                : "from-[var(--color-trash-idle-from)] via-[var(--color-trash-idle-via)] to-transparent"
              }`}
          >
            <div
              className={`flex flex-col items-center transition-transform duration-200 ${trashActive ? "scale-125" : "scale-100"
                }`}
            >
              <span
                className={`grid h-14 w-14 place-items-center rounded-full border-2 transition-colors ${trashActive
                    ? "border-white bg-white text-[var(--color-danger)]"
                    : "border-white/60 bg-[var(--color-trash-idle-via)] text-white"
                  }`}
              >
                <Trash2 aria-hidden="true" size={27} />
              </span>
              <span className="mt-2 text-xs font-semibold">
                {trashActive ? "Release to remove" : "Drag here to remove"}
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
            className={`absolute h-[12vmax] w-[12vmax] -translate-x-1/2 -translate-y-1/2 rounded-[52%_48%_44%_56%] transition-transform duration-1000 ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform ${darkMode ? "bg-[var(--color-night)]" : "bg-white"
              } ${dropExpanded ? "scale-[24]" : "scale-0"}`}
            style={{
              left: dropOrigin.x,
              top: dropOrigin.y,
            }}
          />
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-[opacity,transform] delay-500 duration-300 ${darkMode ? "text-white" : "text-[var(--color-ink-deep)]"
              } ${dropExpanded
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0"
              }`}
          >
            <span className="text-4xl font-black tracking-[0.2em]">
              {transitionAccount?.shortTitle}
            </span>
            <span
              className={`mt-3 text-xs font-medium ${darkMode ? "text-white/70" : "text-[var(--color-muted)]"
                }`}
            >
              Opening {transitionAccount?.fullTitle}
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
