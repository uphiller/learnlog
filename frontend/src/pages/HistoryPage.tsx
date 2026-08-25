import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { api, type HistoryCalendarResponse, type HistoryEvent } from "../api";
import { bookPath } from "../routes";
import { LoadingState } from "../LoadingState";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const { authenticated } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<HistoryCalendarResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cells = useMemo(() => buildCalendarCells(year, month), [year, month]);
  const dateLocale = i18n.language === "ko" ? "ko-KR" : "en-US";

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    api
      .getHistoryCalendar(year, month)
      .then((res) => {
        setData(res);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, month, authenticated]);

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const selectedEvents: HistoryEvent[] =
    selectedDate && data?.events_by_date[selectedDate] ? data.events_by_date[selectedDate] : [];

  const eventCountForDay = (day: number) => {
    const key = isoDate(year, month, day);
    return data?.events_by_date[key]?.length ?? 0;
  };

  function formatSelectedDate(dateKey: string): string {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (!authenticated) {
    return (
      <div className="m-page">
        <p className="m-muted m-text-center">{t("history.loginRequired")}</p>
      </div>
    );
  }

  return (
    <div className="m-page m-page--narrow">
      <header className="m-page-head m-page-head--center">
        <h1 className="m-page-head__title m-serif">{t("history.title")}</h1>
        <p className="m-page-head__sub">{t("history.subtitle")}</p>
      </header>

      <div className="m-cal">
        <div className="m-cal__nav">
          <button type="button" className="m-link-btn" onClick={prevMonth} aria-label={t("history.prevMonth")}>
            ←
          </button>
          <h2 className="m-cal__title">{t("history.monthTitle", { year, month })}</h2>
          <button type="button" className="m-link-btn" onClick={nextMonth} aria-label={t("history.nextMonth")}>
            →
          </button>
        </div>

        <div className="m-cal__weekdays">
          {WEEKDAY_KEYS.map((key) => (
            <span key={key} className="m-cal__weekday">
              {t(`history.weekdays.${key}`)}
            </span>
          ))}
        </div>

        {error && <p className="m-error">{error}</p>}

        <div className="m-cal__grid-wrap">
          {loading && <LoadingState overlay />}

          <div
            className="m-cal__grid"
            role="grid"
            aria-label={t("history.calendarLabel", { year, month })}
            aria-busy={loading}
          >
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="m-cal__cell m-cal__cell--empty" />;
            }
            const dateKey = isoDate(year, month, day);
            const count = eventCountForDay(day);
            const isSelected = selectedDate === dateKey;
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() + 1 === month &&
              today.getDate() === day;

            return (
              <button
                key={dateKey}
                type="button"
                className={[
                  "m-cal__cell",
                  count > 0 ? "m-cal__cell--has-events" : "",
                  isSelected ? "m-cal__cell--selected" : "",
                  isToday ? "m-cal__cell--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span className="m-cal__day">{day}</span>
                {count > 0 && (
                  <span className="m-cal__dots" aria-label={t("common.eventCount", { count })}>
                    {count > 3 ? "•••" : "•".repeat(count)}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>

        <section className="m-cal-detail" aria-live="polite">
          <h3 className="m-cal-detail__title">
            {selectedDate ? formatSelectedDate(selectedDate) : t("history.selectDate")}
          </h3>
          {selectedDate && selectedEvents.length === 0 && (
            <p className="m-muted">{t("history.noEvents")}</p>
          )}
          <ul className="m-cal-detail__list">
            {selectedEvents.map((ev) => (
              <li key={`${ev.kind}-${ev.id}`}>
                <Link to={bookPath(`/${ev.book_id}`)} className="m-cal-event">
                  <span className={`m-cal-event__badge m-cal-event__badge--${ev.kind}`}>
                    {ev.kind === "book" ? t("history.eventBook") : t("history.eventQuote")}
                  </span>
                  <div>
                    <strong>{ev.title}</strong>
                    {ev.kind === "quote" && ev.preview && (
                      <p className="m-cal-event__preview">{ev.preview}</p>
                    )}
                    {ev.kind === "book" && ev.subtitle && (
                      <p className="m-cal-event__preview">{ev.subtitle}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="m-back">
        <Link to="/">{t("history.backHome")}</Link>
      </p>
    </div>
  );
}
