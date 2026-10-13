import type { Request } from "express";

/** İstemci IP'si. X-Forwarded-For yalnızca TRUST_PROXY=1 iken okunur. */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      return forwarded.split(",")[0].trim().slice(0, 64);
    }
  }
  return (req.ip || req.socket?.remoteAddress || "0.0.0.0").slice(0, 64);
}
