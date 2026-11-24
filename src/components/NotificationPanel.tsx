"use client";

import useLiveWorkforceResource from "../features/workforce/useLiveWorkforceResource";
import type { WorkforceNotification } from "../lib/supabase/notification-data";

type NotificationData = {
  notifications: WorkforceNotification[];
  unreadCount: number;
};

export default function NotificationPanel({ darkMode }: { darkMode: boolean }) {
  // Keep the panel in sync with notification updates while retaining the last response on refresh errors.
  const { data, loading, error } = useLiveWorkforceResource<NotificationData>("/api/notifications");
  // Use theme-aware colors for borders and secondary text.
  const borderClass = darkMode ? "border-[#2b3e61]" : "border-[#edf1f7]";
  const mutedClass = darkMode ? "text-[#aabbd5]" : "text-[#657796]";


  
  return (
    <div
      id="portal-notifications"
      role="dialog"
      aria-label="Notifications"
      aria-busy={loading}
      className={`account-menu absolute top-[46px] right-0 z-50 w-[min(330px,calc(100vw-32px))] rounded-[14px] p-4 shadow-[0_16px_35px_#09276132] sm:right-[-55px] ${darkMode ? "bg-[#172746] text-[#edf4ff]" : "bg-white text-[#142044]"}`}
    >
      <div className={`flex items-center justify-between border-b pb-3 font-bold ${borderClass}`}>
        <span>Notifications</span>
        {/* Show the unread total only after notification data is available. */}
        {data && <span className="rounded-[10px] bg-[#e8f0f6] px-2 py-1 text-[11px] text-[#2F6798]">{data.unreadCount} unread</span>}
      </div>
      {error && !data && <p role="alert" className={`py-4 text-xs ${mutedClass}`}>Notifications could not be loaded.</p>}
      {loading && !data && <p role="status" className={`py-4 text-xs ${mutedClass}`}>Loading notifications…</p>}
      {data?.notifications.length ? (
        <ul>
          {data.notifications.map((notification) => {
            // Restrict notification links to local paths, excluding protocol-relative URLs.
            const actionHref = notification.action_url?.startsWith("/") && !notification.action_url.startsWith("//")
              ? notification.action_url
              : null;

            return (
              <li key={notification.notification_id} className={`border-b py-3 ${borderClass}`}>
                <div className="flex gap-2.5">
                  <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? "bg-transparent" : "bg-[#2F6798]"}`} />
                  <div className="min-w-0">
                    {actionHref ? (
                      <a href={actionHref} className="block text-xs font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">
                        {notification.title}
                      </a>
                    ) : (
                      <strong className="block text-xs">{notification.title}</strong>
                    )}
                      <p className={`mt-1 text-[11px] leading-4 ${mutedClass}`}>{notification.description}</p>
                    {/* Format timestamps for display while preserving the original value for assistive technology. */}
                    <time dateTime={notification.created_at} className={`mt-1 block text-[10px] ${mutedClass}`}>
                      {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.created_at))}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : data ? (
        <p className={`py-4 text-xs ${mutedClass}`}>No notifications.</p>
      ) : null}
      {error && data && <p role="status" className={`pt-3 text-[10px] ${mutedClass}`}>Refresh failed. Showing the last loaded records.</p>}
    </div>
  );
}