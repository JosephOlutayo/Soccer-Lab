import { NextResponse } from "next/server";
import type { FetchFailure } from "@/lib/football-data";

/**
 * One place that turns an upstream failure into an HTTP response.
 *
 * These were previously mapped ad hoc per route, which is how a 429 ended up
 * being reported as a plan restriction. Keeping the mapping here means a new
 * route cannot reintroduce that drift.
 *
 * `retry` tells the client whether the same request is worth repeating: a
 * throttle clears on its own, a plan limit does not.
 */
const FAILURES: Record<
  FetchFailure,
  { message: string; status: number; retry: boolean }
> = {
  restricted: {
    message: "Not available on the free API tier",
    status: 403,
    retry: false,
  },
  "rate-limited": {
    message: "Rate limit reached — retrying shortly",
    status: 429,
    retry: true,
  },
  error: {
    message: "Upstream request failed",
    status: 502,
    retry: true,
  },
};

export function failureResponse(failure: FetchFailure, context?: string) {
  const { message, status, retry } = FAILURES[failure];
  return NextResponse.json(
    { error: context ? `${context}: ${message}` : message, retry },
    { status },
  );
}
