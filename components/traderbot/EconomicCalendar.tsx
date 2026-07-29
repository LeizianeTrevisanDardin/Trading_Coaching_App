"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  RefreshCw,
} from "lucide-react";

type EventImpact = "high" | "medium" | "low";

type EconomicEvent = {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: EventImpact;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  category: string;
  source: string;
};

type EconomicCalendarResponse = {
  events?: EconomicEvent[];
  updatedAt?: string;
  timeZone?: string;
  demoMode?: boolean;
  error?: string;
};

type EventTimingStatus =
  | "finished"
  | "blocked"
  | "approaching"
  | "upcoming";

const BLOCK_BEFORE_MINUTES = 5;
const BLOCK_AFTER_MINUTES = 10;
const APPROACHING_MINUTES = 15;

function formatEventDate(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatEventTime(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatUpdatedAt(dateValue: string | null): string {
  if (!dateValue) {
    return "Not updated yet";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getMinutesUntilEvent(
  eventDate: string,
  currentTime: number
): number {
  return (new Date(eventDate).getTime() - currentTime) / 60_000;
}

function getEventTimingStatus(
  eventDate: string,
  currentTime: number
): EventTimingStatus {
  const minutesUntil = getMinutesUntilEvent(
    eventDate,
    currentTime
  );

  if (minutesUntil < -BLOCK_AFTER_MINUTES) {
    return "finished";
  }

  if (
    minutesUntil <= BLOCK_BEFORE_MINUTES &&
    minutesUntil >= -BLOCK_AFTER_MINUTES
  ) {
    return "blocked";
  }

  if (
    minutesUntil > BLOCK_BEFORE_MINUTES &&
    minutesUntil <= APPROACHING_MINUTES
  ) {
    return "approaching";
  }

  return "upcoming";
}

function formatCountdown(milliseconds: number): string {
  const safeMilliseconds = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safeMilliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getImpactLabel(impact: EventImpact): string {
  if (impact === "high") {
    return "High Impact";
  }

  if (impact === "medium") {
    return "Medium Impact";
  }

  return "Low Impact";
}

function getImpactClasses(impact: EventImpact): string {
  if (impact === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (impact === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getStatusMessage(
  status: EventTimingStatus
): string {
  if (status === "finished") {
    return "Event finished";
  }

  if (status === "blocked") {
    return "Avoid new entries";
  }

  if (status === "approaching") {
    return "Event approaching";
  }

  return "Upcoming event";
}

export default function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [highImpactOnly, setHighImpactOnly] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalendar = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await fetch(
          "/api/economic-calendar",
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const data: EconomicCalendarResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Unable to load the economic calendar."
          );
        }

        setEvents(data.events ?? []);
        setUpdatedAt(
          data.updatedAt ?? new Date().toISOString()
        );
        setDemoMode(Boolean(data.demoMode));
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load the economic calendar.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const displayedEvents = useMemo(() => {
    if (!highImpactOnly) {
      return events;
    }

    return events.filter(
      (event) => event.impact === "high"
    );
  }, [events, highImpactOnly]);

  const nextEvent = useMemo(() => {
    return events.find(
      (event) =>
        new Date(event.date).getTime() > currentTime
    );
  }, [events, currentTime]);

  const activeRiskEvent = useMemo(() => {
    return events.find((event) => {
      if (event.impact !== "high") {
        return false;
      }

      const status = getEventTimingStatus(
        event.date,
        currentTime
      );

      return (
        status === "blocked" ||
        status === "approaching"
      );
    });
  }, [events, currentTime]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex min-h-60 items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-500" />

            <p className="mt-4 text-sm font-medium text-slate-700">
              Loading economic calendar...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />

          <div>
            <h2 className="text-lg font-bold text-red-900">
              Unable to load economic calendar
            </h2>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadCalendar(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-slate-900" />

            <h2 className="text-xl font-bold text-slate-950">
              Economic Calendar
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            United States economic events shown in New York
            time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock3 className="h-4 w-4" />
            Updated {formatUpdatedAt(updatedAt)}
          </div>

          <button
            type="button"
            onClick={() => void loadCalendar(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>
      </div>

      {demoMode ? (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-900">
            Demo mode
          </p>

          <p className="mt-1 text-sm text-blue-700">
            These events are being used to test the screen.
            Confirm real events with an official calendar before
            trading.
          </p>
        </div>
      ) : null}

      {activeRiskEvent ? (
        <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                High-impact warning
              </p>

              <h3 className="mt-1 text-lg font-bold text-red-950">
                Avoid opening new positions
              </h3>

              <p className="mt-1 text-sm text-red-800">
                {activeRiskEvent.title} is scheduled for{" "}
                {formatEventTime(activeRiskEvent.date)}.
              </p>

              <p className="mt-2 text-sm font-semibold text-red-900">
                Blocked window: 5 minutes before until 10
                minutes after the release.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {nextEvent ? (
        <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-300">
            Next scheduled event
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">
                {nextEvent.title}
              </h3>

              <p className="mt-1 text-sm text-slate-300">
                {formatEventDate(nextEvent.date)} at{" "}
                {formatEventTime(nextEvent.date)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Starts in
              </p>

              <p className="mt-1 font-mono text-2xl font-bold">
                {formatCountdown(
                  new Date(nextEvent.date).getTime() -
                    currentTime
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {displayedEvents.length} event
          {displayedEvents.length === 1 ? "" : "s"}
        </p>

        <button
          type="button"
          onClick={() =>
            setHighImpactOnly((current) => !current)
          }
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
            highImpactOnly
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Filter className="h-4 w-4" />

          {highImpactOnly
            ? "Showing High Impact Only"
            : "High Impact Only"}
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {displayedEvents.map((event) => {
          const status = getEventTimingStatus(
            event.date,
            currentTime
          );

          return (
            <article
              key={event.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${getImpactClasses(
                        event.impact
                      )}`}
                    >
                      {getImpactLabel(event.impact)}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {event.category}
                    </span>

                    <span className="text-xs text-slate-500">
                      🇺🇸 {event.country}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-950">
                    {event.title}
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {formatEventDate(event.date)} ·{" "}
                    {formatEventTime(event.date)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Forecast
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {event.forecast ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Previous
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {event.previous ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Actual
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {event.actual ?? "Pending"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                {status === "finished" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Clock3 className="h-4 w-4 text-slate-500" />
                )}

                <p className="text-sm font-semibold text-slate-600">
                  {getStatusMessage(status)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}