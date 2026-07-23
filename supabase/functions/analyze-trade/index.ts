import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-3.6-flash";

type RequestMode = "extract" | "analyze";
type TradeDirection = "long" | "short";
type ExtractedDirection = TradeDirection | "wait";
type MarketTrend = "uptrend" | "downtrend" | "consolidation";
type CandleSignal = "strength" | "rejection" | "indecision";
type ScreenshotMoment =
  | "pre_trade"
  | "after_entry"
  | "in_trade"
  | "post_trade";

type TradeRequest = {
  mode?: RequestMode;
  symbol?: string;
  timeframe?: string;
  strategy?: string;
  direction?: TradeDirection;
  entryPrice?: number;
  stopLoss?: number;
  targetPrice?: number;
  marketTrend?: string;
  screenshotMoment?: string;
  imageBase64?: string;
  imageMimeType?: string;
};

type TradeAnalysis = {
  score: number;
  decision:
    | "SETUP_CONFIRMED"
    | "WAIT_FOR_CONFIRMATION"
    | "SETUP_INVALID";
  setupType: string;
  summary: string;
  positives: string[];
  warnings: string[];
  confirmationsMissing: string[];
  riskAssessment: string;
  managementAdvice: string;
  lesson: string;
};

type ExtractedField<T> = {
  value: T | null;
  confidence: number;
  needsAttention: boolean;
  note: string;
};

type ScreenshotExtraction = {
  symbol: ExtractedField<string>;
  timeframe: ExtractedField<string>;
  marketTrend: ExtractedField<MarketTrend>;
  direction: ExtractedField<ExtractedDirection>;
  swingHigh: ExtractedField<number>;
  swingLow: ExtractedField<number>;
  breakout: ExtractedField<boolean>;
  retest: ExtractedField<boolean>;
  candleSignal: ExtractedField<CandleSignal>;
  entryPrice: ExtractedField<number>;
  stopLoss: ExtractedField<number>;
  targetPrice: ExtractedField<number>;
  screenshotMoment: ExtractedField<ScreenshotMoment>;
  generalWarnings: string[];
};

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
};

class TradeValidationError extends Error {
  details: string[];

  constructor(details: string[]) {
    super("Invalid trade information.");
    this.name = "TradeValidationError";
    this.details = details;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extractJson<T>(text: string): T {
  const cleanedText = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleanedText) as T;
}

function validateTrade(body: TradeRequest): string[] {
  const errors: string[] = [];

  if (!body.symbol?.trim()) errors.push("Symbol is required.");
  if (!body.timeframe?.trim()) errors.push("Timeframe is required.");

  if (body.direction !== "long" && body.direction !== "short") {
    errors.push("Direction must be long or short.");
  }

  if (!Number.isFinite(body.entryPrice)) {
    errors.push("Entry price must be valid.");
  }

  if (!Number.isFinite(body.stopLoss)) {
    errors.push("Stop loss must be valid.");
  }

  if (!Number.isFinite(body.targetPrice)) {
    errors.push("Target price must be valid.");
  }

  if (
    errors.length > 0 ||
    body.entryPrice === undefined ||
    body.stopLoss === undefined ||
    body.targetPrice === undefined
  ) {
    return errors;
  }

  if (body.direction === "long") {
    if (body.stopLoss >= body.entryPrice) {
      errors.push("For a long trade, stop loss must be below entry.");
    }

    if (body.targetPrice <= body.entryPrice) {
      errors.push("For a long trade, target must be above entry.");
    }
  }

  if (body.direction === "short") {
    if (body.stopLoss <= body.entryPrice) {
      errors.push("For a short trade, stop loss must be above entry.");
    }

    if (body.targetPrice >= body.entryPrice) {
      errors.push("For a short trade, target must be below entry.");
    }
  }

  return errors;
}

async function callGemini(
  geminiApiKey: string,
  parts: GeminiPart[],
  temperature = 0.2,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    console.error("Gemini API error:", response.status, details);
    throw new Error(`Gemini request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("Gemini empty response:", JSON.stringify(data));
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

function normalizeConfidence(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function normalizeField<T>(
  field: Partial<ExtractedField<T>> | undefined,
): ExtractedField<T> {
  const confidence = normalizeConfidence(field?.confidence);

  return {
    value: field?.value ?? null,
    confidence,
    needsAttention:
      field?.needsAttention === true ||
      confidence < 75 ||
      field?.value === null ||
      field?.value === undefined,
    note:
      typeof field?.note === "string" && field.note.trim()
        ? field.note.trim()
        : "Review this field before analyzing the trade.",
  };
}

function normalizeExtraction(
  extraction: Partial<ScreenshotExtraction>,
): ScreenshotExtraction {
  return {
    symbol: normalizeField(extraction.symbol),
    timeframe: normalizeField(extraction.timeframe),
    marketTrend: normalizeField(extraction.marketTrend),
    direction: normalizeField(extraction.direction),
    swingHigh: normalizeField(extraction.swingHigh),
    swingLow: normalizeField(extraction.swingLow),
    breakout: normalizeField(extraction.breakout),
    retest: normalizeField(extraction.retest),
    candleSignal: normalizeField(extraction.candleSignal),
    entryPrice: normalizeField(extraction.entryPrice),
    stopLoss: normalizeField(extraction.stopLoss),
    targetPrice: normalizeField(extraction.targetPrice),
    screenshotMoment: normalizeField(extraction.screenshotMoment),
    generalWarnings: Array.isArray(extraction.generalWarnings)
      ? extraction.generalWarnings.filter(
          (warning): warning is string => typeof warning === "string",
        )
      : [],
  };
}

async function extractScreenshotData(
  body: TradeRequest,
  geminiApiKey: string,
): Promise<ScreenshotExtraction> {
  if (!body.imageBase64 || !body.imageMimeType) {
    throw new Error("Screenshot is required for automatic extraction.");
  }

  const prompt = `
You are TraderBot AI, an educational chart-reading assistant.

Analyze the uploaded trading-chart screenshot and return editable form values.
The goal is to detect chart information and, when possible, create an EDUCATIONAL example trade plan from the visible market structure.

IMPORTANT SAFETY AND ACCURACY RULES:
- This is educational chart analysis, not financial advice.
- Never promise profit or claim a trade will win.
- Use the visible price axis, candle prices, labels, boxes, horizontal lines and market structure.
- Do not create random numbers.
- First determine whether the screenshot has a readable price scale.
- If the price scale is readable, estimate numeric levels from the scale even when exact labels are not drawn.
- Estimated values must be marked needsAttention=true and the note must say that the value is AI-estimated.
- If the price scale is not readable enough to create a defensible estimate, return null.
- Round prices according to the precision visible on the chart.
- Confidence must be from 0 to 100.
- Return JSON only. Do not use Markdown.

CHART VALUES:
1. swingHigh:
   - Use the most relevant recent visible structural high.
   - It may be estimated from the price axis.
2. swingLow:
   - Use the most relevant recent visible structural low.
   - It may be estimated from the price axis.
3. marketTrend:
   - uptrend, downtrend or consolidation.
4. direction:
   - long when the visible setup favors an educational long plan.
   - short when the visible setup favors an educational short plan.
   - wait when the direction is unclear or confirmation is missing.
5. breakout and retest:
   - Evaluate them from visible price action, boxes and levels.
6. candleSignal:
   - strength, rejection or indecision.

EDUCATIONAL TRADE-PLAN VALUES:
- Try to fill entryPrice, stopLoss and targetPrice whenever a readable price scale and a coherent setup exist.
- These values are suggestions derived from the chart, not values explicitly placed by the user.
- In every suggested Entry/Stop/Target note, begin with "AI-suggested:".

LONG PLAN:
- Entry: above a confirmation candle, above a breakout level, or near a defended retest level.
- Stop: below the relevant swing low, retest low or invalidation level.
- Target: calculate a 2R target using target = entry + 2 * (entry - stop).

SHORT PLAN:
- Entry: below a confirmation candle, below a breakdown level, or near a rejected retest level.
- Stop: above the relevant swing high, retest high or invalidation level.
- Target: calculate a 2R target using target = entry - 2 * (stop - entry).

WAIT CONDITION:
- Direction may remain "wait" when a trade should not be taken yet.
- Even when direction is "wait", you may provide a CONDITIONAL educational plan if the chart supports it.
- Example note: "AI-suggested conditional long entry only after a candle closes above 722.40."
- The numeric relationship must still be valid:
  long: stop < entry < target
  short: target < entry < stop

SYMBOL AND TIMEFRAME:
- Extract only when visible. Otherwise return null.

SCREENSHOT MOMENT:
- pre_trade, after_entry, in_trade or post_trade.

Return exactly this JSON structure:
{
  "symbol": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "timeframe": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "marketTrend": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "direction": {"value": "wait", "confidence": 0, "needsAttention": true, "note": ""},
  "swingHigh": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "swingLow": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "breakout": {"value": false, "confidence": 0, "needsAttention": true, "note": ""},
  "retest": {"value": false, "confidence": 0, "needsAttention": true, "note": ""},
  "candleSignal": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "entryPrice": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "stopLoss": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "targetPrice": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "screenshotMoment": {"value": null, "confidence": 0, "needsAttention": true, "note": ""},
  "generalWarnings": []
}
`;

  const responseText = await callGemini(
    geminiApiKey,
    [
      { text: prompt },
      {
        inlineData: {
          mimeType: body.imageMimeType,
          data: body.imageBase64,
        },
      },
    ],
    0.1,
  );

  const extraction = normalizeExtraction(
    extractJson<Partial<ScreenshotExtraction>>(responseText),
  );

  const entry = extraction.entryPrice.value;
  const stop = extraction.stopLoss.value;
  const target = extraction.targetPrice.value;
  const direction = extraction.direction.value;

  if (
    direction === "long" &&
    entry !== null &&
    stop !== null &&
    target !== null &&
    !(stop < entry && entry < target)
  ) {
    extraction.entryPrice.needsAttention = true;
    extraction.stopLoss.needsAttention = true;
    extraction.targetPrice.needsAttention = true;
    extraction.generalWarnings.push(
      "The AI-generated long plan has inconsistent price ordering. Review Entry, Stop Loss and Target manually.",
    );
  }

  if (
    direction === "short" &&
    entry !== null &&
    stop !== null &&
    target !== null &&
    !(target < entry && entry < stop)
  ) {
    extraction.entryPrice.needsAttention = true;
    extraction.stopLoss.needsAttention = true;
    extraction.targetPrice.needsAttention = true;
    extraction.generalWarnings.push(
      "The AI-generated short plan has inconsistent price ordering. Review Entry, Stop Loss and Target manually.",
    );
  }

  if (entry !== null && stop !== null && target !== null) {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    const rr = risk > 0 ? reward / risk : 0;

    extraction.generalWarnings.push(
      `AI educational plan risk-to-reward: approximately 1:${rr.toFixed(2)}.`,
    );
  }

  return extraction;
}

async function analyzeTrade(
  body: TradeRequest,
  geminiApiKey: string,
): Promise<{
  analysis: TradeAnalysis;
  calculations: {
    riskPoints: number;
    rewardPoints: number;
    riskReward: number;
  };
}> {
  const validationErrors = validateTrade(body);
  if (validationErrors.length > 0) {
    throw new TradeValidationError(validationErrors);
  }

  const entryPrice = body.entryPrice as number;
  const stopLoss = body.stopLoss as number;
  const targetPrice = body.targetPrice as number;
  const direction = body.direction as TradeDirection;

  const riskPoints = Math.abs(entryPrice - stopLoss);
  const rewardPoints = Math.abs(targetPrice - entryPrice);
  const riskReward = rewardPoints / riskPoints;

  const prompt = `
You are TraderBot AI, an educational trading coach.

Evaluate whether the proposed setup follows structured price-action and risk-management principles.
Do not provide financial advice, guarantee profits or claim a trade will win.
Use only the supplied values and visible chart information.

Analyze:
- Direction and market-trend alignment
- Market structure
- Breakout and retest quality
- Confirmation candle
- Entry location
- Stop-loss invalidation
- Target placement
- Risk-to-reward
- Chasing risk
- Missing confirmation

Trade information:
Symbol: ${body.symbol}
Timeframe: ${body.timeframe}
Strategy: ${body.strategy || "Not provided"}
Direction: ${direction}
Entry price: ${entryPrice}
Stop loss: ${stopLoss}
Target price: ${targetPrice}
Risk points: ${riskPoints.toFixed(2)}
Reward points: ${rewardPoints.toFixed(2)}
Risk-to-reward: ${riskReward.toFixed(2)}
Market trend: ${body.marketTrend || "Not provided"}
Screenshot moment: ${body.screenshotMoment || "Not provided"}

Decision values:
- SETUP_CONFIRMED
- WAIT_FOR_CONFIRMATION
- SETUP_INVALID

Return only JSON:
{
  "score": 0,
  "decision": "SETUP_CONFIRMED",
  "setupType": "",
  "summary": "",
  "positives": [],
  "warnings": [],
  "confirmationsMissing": [],
  "riskAssessment": "",
  "managementAdvice": "",
  "lesson": ""
}

All text must be in English.
`;

  const parts: GeminiPart[] = [{ text: prompt }];

  if (body.imageBase64 && body.imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: body.imageMimeType,
        data: body.imageBase64,
      },
    });
  }

  const responseText = await callGemini(geminiApiKey, parts, 0.2);
  const analysis = extractJson<TradeAnalysis>(responseText);

  if (
    !Number.isFinite(analysis.score) ||
    ![
      "SETUP_CONFIRMED",
      "WAIT_FOR_CONFIRMATION",
      "SETUP_INVALID",
    ].includes(analysis.decision)
  ) {
    throw new Error("Gemini returned an invalid trade analysis.");
  }

  analysis.score = Math.max(0, Math.min(100, Math.round(analysis.score)));
  analysis.positives = Array.isArray(analysis.positives)
    ? analysis.positives
    : [];
  analysis.warnings = Array.isArray(analysis.warnings)
    ? analysis.warnings
    : [];
  analysis.confirmationsMissing = Array.isArray(
    analysis.confirmationsMissing,
  )
    ? analysis.confirmationsMissing
    : [];

  return {
    analysis,
    calculations: { riskPoints, rewardPoints, riskReward },
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const body = (await request.json()) as TradeRequest;
    const mode: RequestMode = body.mode === "extract" ? "extract" : "analyze";

    if (mode === "extract") {
      const extraction = await extractScreenshotData(body, geminiApiKey);
      return jsonResponse({ extraction });
    }

    const result = await analyzeTrade(body, geminiApiKey);
    return jsonResponse(result);
  } catch (error) {
    console.error("Analyze trade error:", error);

    if (error instanceof TradeValidationError) {
      return jsonResponse(
        { error: error.message, details: error.details },
        400,
      );
    }

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return jsonResponse({ error: message }, 500);
  }
});