import { TIMEOUT_MS } from "../config";

export type WebhookForwardResult =
  | { ok: true; status: number }
  | { ok: false; status: number; error?: string };

export async function forwardWebhookPayload(
  target: string,
  payload: Record<string, unknown>,
  timeoutMs = TIMEOUT_MS,
): Promise<WebhookForwardResult> {
  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    return { ok: res.ok, status: res.status };
  } catch (err) {
    const error =
      err instanceof Error && err.name === "TimeoutError"
        ? `timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : "Failed to reach notify target";
    return { ok: false, status: 0, error };
  }
}
