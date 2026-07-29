import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EconomicEvent = {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: "high" | "medium" | "low";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  category: string;
  source: string;
};

function createEasternDate(
  daysFromToday: number,
  hour: number,
  minute: number
): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const easternParts = formatter
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") {
        result[part.type] = part.value;
      }

      return result;
    }, {});

  const baseDate = new Date(
    `${easternParts.year}-${easternParts.month}-${easternParts.day}T12:00:00`
  );

  baseDate.setDate(baseDate.getDate() + daysFromToday);

  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getDate()).padStart(2, "0");
  const formattedHour = String(hour).padStart(2, "0");
  const formattedMinute = String(minute).padStart(2, "0");

  /*
   * The offset below is only used for our temporary demo data.
   * America/New_York is UTC-4 during daylight-saving time.
   */
  return `${year}-${month}-${day}T${formattedHour}:${formattedMinute}:00-04:00`;
}

export async function GET() {
  try {
    const events: EconomicEvent[] = [
      {
        id: "gdp-demo",
        title: "GDP — Advance Estimate",
        country: "United States",
        date: createEasternDate(0, 8, 30),
        impact: "high",
        forecast: "2.4%",
        previous: "2.1%",
        actual: null,
        category: "Growth",
        source: "Demo data",
      },
      {
        id: "jobless-claims-demo",
        title: "Initial Jobless Claims",
        country: "United States",
        date: createEasternDate(0, 8, 30),
        impact: "medium",
        forecast: "225K",
        previous: "221K",
        actual: null,
        category: "Employment",
        source: "Demo data",
      },
      {
        id: "consumer-confidence-demo",
        title: "Consumer Confidence",
        country: "United States",
        date: createEasternDate(0, 10, 0),
        impact: "medium",
        forecast: "96.0",
        previous: "94.5",
        actual: null,
        category: "Consumer",
        source: "Demo data",
      },
      {
        id: "bond-auction-demo",
        title: "7-Year Treasury Note Auction",
        country: "United States",
        date: createEasternDate(0, 13, 0),
        impact: "low",
        forecast: null,
        previous: "4.15%",
        actual: null,
        category: "Bonds",
        source: "Demo data",
      },
      {
        id: "employment-demo",
        title: "Employment Situation",
        country: "United States",
        date: createEasternDate(1, 8, 30),
        impact: "high",
        forecast: "150K",
        previous: "147K",
        actual: null,
        category: "Employment",
        source: "Demo data",
      },
    ];

    events.sort(
      (firstEvent, secondEvent) =>
        new Date(firstEvent.date).getTime() -
        new Date(secondEvent.date).getTime()
    );

    return NextResponse.json(
      {
        events,
        updatedAt: new Date().toISOString(),
        timeZone: "America/New_York",
        demoMode: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Economic calendar route error:", error);

    return NextResponse.json(
      {
        error: "Unable to prepare the economic calendar.",
      },
      {
        status: 500,
      }
    );
  }
}