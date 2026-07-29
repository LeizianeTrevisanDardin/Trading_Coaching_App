"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock3,
  ExternalLink,
  Newspaper,
  RefreshCw,
} from "lucide-react";

type MarketNewsArticle = {
  id: string;
  symbol: string;
  publishedDate: string;
  publisher: string;
  title: string;
  image: string | null;
  site: string;
  text: string;
  url: string;
};

type MarketNewsResponse = {
  articles?: MarketNewsArticle[];
  updatedAt?: string;
  error?: string;
};

const FILTERS = [
  "ALL",
  "NVDA",
  "AAPL",
  "MSFT",
  "AMZN",
  "META",
  "TSLA",
  "GOOGL",
  "AMD",
] as const;

type NewsFilter = (typeof FILTERS)[number];

function formatPublishedDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return "Not updated yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function shortenText(text: string, maxLength = 180): string {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return "Open the article to read the full market update.";
  }

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, maxLength).trim()}...`;
}

export default function MarketNewsCard() {
  const [articles, setArticles] = useState<MarketNewsArticle[]>([]);
  const [selectedFilter, setSelectedFilter] =
    useState<NewsFilter>("ALL");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNews = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await fetch("/api/market-news", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data: MarketNewsResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ?? "Unable to load market news."
          );
        }

        setArticles(data.articles ?? []);
        setUpdatedAt(data.updatedAt ?? new Date().toISOString());
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load market news.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const filteredArticles = useMemo(() => {
    if (selectedFilter === "ALL") {
      return articles;
    }

    return articles.filter(
      (article) => article.symbol === selectedFilter
    );
  }, [articles, selectedFilter]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-slate-500" />

            <p className="text-sm font-medium text-slate-700">
              Loading market news...
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

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-red-900">
              Unable to load market news
            </h2>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadNews(true)}
              disabled={refreshing}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

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
            <Newspaper className="h-6 w-6 text-slate-900" />

            <h2 className="text-xl font-bold text-slate-950">
              Market News
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            News related to companies that can influence NQ and
            MNQ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
            <Clock3 className="h-4 w-4" />
            Updated {formatUpdatedAt(updatedAt)}
          </div>

          <button
            type="button"
            onClick={() => void loadNews(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((filter) => {
          const isSelected = selectedFilter === filter;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedFilter(filter)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                isSelected
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {filteredArticles.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <Newspaper className="mx-auto h-8 w-8 text-slate-400" />

          <p className="mt-3 font-semibold text-slate-700">
            No news found for this filter.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Try selecting another company or refresh the page.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {filteredArticles.map((article) => {
            return (
              <article
                key={article.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {article.image ? (
                  <div className="h-44 overflow-hidden bg-slate-100">
                    <img
                      src={article.image}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {article.symbol}
                    </span>

                    <span className="text-xs text-slate-500">
                      {article.publisher}
                    </span>

                    <span className="text-xs text-slate-400">
                      •
                    </span>

                    <span className="text-xs text-slate-500">
                      {formatPublishedDate(
                        article.publishedDate
                      )}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold leading-6 text-slate-950">
                    {article.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                    {shortenText(article.text)}
                  </p>

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-900"
                  >
                    Read full article
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}