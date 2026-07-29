import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FinnhubNewsArticle = {
  category?: string;
  datetime?: number;
  headline?: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
};

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

const IMPORTANT_SYMBOLS = [
  "NVDA",
  "AAPL",
  "MSFT",
  "AMZN",
  "META",
  "TSLA",
  "GOOGL",
  "AMD",
] as const;

const DAYS_TO_SEARCH = 7;
const MAX_ARTICLES_PER_SYMBOL = 8;
const MAX_TOTAL_ARTICLES = 50;

function formatDateForFinnhub(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function convertTimestampToDate(timestamp?: number): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  return new Date(timestamp * 1000).toISOString();
}

function getProviderErrorMessage(data: unknown): string {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;

    const possibleFields = [
      "error",
      "message",
      "detail",
      "Information",
      "Note",
    ];

    for (const field of possibleFields) {
      const value = record[field];

      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }

    try {
      return JSON.stringify(data);
    } catch {
      return "Unknown provider error.";
    }
  }

  return "Unknown provider error.";
}

async function fetchCompanyNews(
  symbol: string,
  apiKey: string,
  from: string,
  to: string
): Promise<MarketNewsArticle[]> {
  const endpoint = new URL(
    "https://finnhub.io/api/v1/company-news"
  );

  endpoint.searchParams.set("symbol", symbol);
  endpoint.searchParams.set("from", from);
  endpoint.searchParams.set("to", to);
  endpoint.searchParams.set("token", apiKey);

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const rawResponse = await response.text();

  let providerData: unknown;

  try {
    providerData = rawResponse
      ? JSON.parse(rawResponse)
      : null;
  } catch {
    providerData = rawResponse;
  }

  if (!response.ok) {
    const providerMessage =
      getProviderErrorMessage(providerData);

    throw new Error(
      `Finnhub error for ${symbol}: ${providerMessage}`
    );
  }

  if (!Array.isArray(providerData)) {
    const providerMessage =
      getProviderErrorMessage(providerData);

    throw new Error(
      `Invalid Finnhub response for ${symbol}: ${providerMessage}`
    );
  }

  return (providerData as FinnhubNewsArticle[])
    .filter((article) => {
      return Boolean(
        article.headline?.trim() &&
          article.url?.trim()
      );
    })
    .slice(0, MAX_ARTICLES_PER_SYMBOL)
    .map((article, index) => {
      return {
        id:
          article.id?.toString() ??
          `${symbol}-${article.datetime ?? index}-${index}`,

        symbol,

        publishedDate: convertTimestampToDate(
          article.datetime
        ),

        publisher:
          article.source?.trim() || "Market News",

        title:
          article.headline?.trim() ||
          "Untitled article",

        image:
          article.image?.trim() || null,

        site:
          article.source?.trim() || "",

        text:
          article.summary?.trim() || "",

        url:
          article.url?.trim() || "",
      };
    });
}

function removeDuplicateArticles(
  articles: MarketNewsArticle[]
): MarketNewsArticle[] {
  const uniqueArticles = new Map<
    string,
    MarketNewsArticle
  >();

  for (const article of articles) {
    const duplicateKey =
      article.url ||
      `${article.title}-${article.publisher}`;

    if (!uniqueArticles.has(duplicateKey)) {
      uniqueArticles.set(duplicateKey, article);
    }
  }

  return Array.from(uniqueArticles.values());
}

export async function GET() {
  try {
    const apiKey =
      process.env.FINNHUB_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "FINNHUB_API_KEY was not found. Add it to .env.local and restart the server.",
        },
        {
          status: 500,
        }
      );
    }

    const today = new Date();

    const startDate = new Date(today);
    startDate.setUTCDate(
      startDate.getUTCDate() - DAYS_TO_SEARCH
    );

    const from = formatDateForFinnhub(startDate);
    const to = formatDateForFinnhub(today);

    const results = await Promise.allSettled(
      IMPORTANT_SYMBOLS.map((symbol) =>
        fetchCompanyNews(
          symbol,
          apiKey,
          from,
          to
        )
      )
    );

    const successfulArticles: MarketNewsArticle[] =
      [];

    const failedSymbols: string[] = [];

    results.forEach((result, index) => {
      const symbol = IMPORTANT_SYMBOLS[index];

      if (result.status === "fulfilled") {
        successfulArticles.push(...result.value);
      } else {
        failedSymbols.push(symbol);

        console.error(
          `Unable to load news for ${symbol}:`,
          result.reason
        );
      }
    });

    if (
      successfulArticles.length === 0 &&
      failedSymbols.length === IMPORTANT_SYMBOLS.length
    ) {
      return NextResponse.json(
        {
          error:
            "Finnhub did not return company news. Check your API plan or request limit.",
          failedSymbols,
        },
        {
          status: 502,
        }
      );
    }

    const articles = removeDuplicateArticles(
      successfulArticles
    )
      .sort((firstArticle, secondArticle) => {
        return (
          new Date(
            secondArticle.publishedDate
          ).getTime() -
          new Date(
            firstArticle.publishedDate
          ).getTime()
        );
      })
      .slice(0, MAX_TOTAL_ARTICLES);

    return NextResponse.json(
      {
        articles,
        updatedAt: new Date().toISOString(),
        total: articles.length,
        provider: "Finnhub",
        dateRange: {
          from,
          to,
        },
        failedSymbols,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error(
      "Market news route error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error.";

    return NextResponse.json(
      {
        error: `Server error: ${message}`,
      },
      {
        status: 500,
      }
    );
  }
}