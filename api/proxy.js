const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length"
]);

function copyHeadersToFetch(reqHeaders) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(reqHeaders)) {
    const lowerKey = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lowerKey) || typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else {
      headers.set(key, value);
    }
  }

  return headers;
}

function copyHeadersToResponse(fetchResponse, res) {
  for (const [key, value] of fetchResponse.headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue;
    }

    res.setHeader(key, value);
  }
}

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  try {
    const currentUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const rawTarget = (currentUrl.searchParams.get("target") || "").replace(/^\/+/, "");

    if (!rawTarget) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error: "Missing target address",
          usage: "Use /github.com or /github.com/owner/repo"
        })
      );
      return;
    }

    // Support /github.com and /https://github.com alike.
    const upstreamUrl = /^https?:\/\//i.test(rawTarget)
      ? new URL(rawTarget)
      : new URL(`https://${rawTarget}`);

    for (const [key, value] of currentUrl.searchParams.entries()) {
      if (key === "target") {
        continue;
      }

      upstreamUrl.searchParams.append(key, value);
    }

    const method = req.method || "GET";
    const headers = copyHeadersToFetch(req.headers);
    headers.set("x-forwarded-host", req.headers.host || "");
    headers.set("x-forwarded-proto", "https");

    const body = method === "GET" || method === "HEAD" ? undefined : await readRawBody(req);

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method,
      headers,
      body,
      redirect: "manual"
    });

    res.statusCode = upstreamResponse.status;
    copyHeadersToResponse(upstreamResponse, res);

    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(responseBuffer);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: "Proxy request failed",
        detail: error instanceof Error ? error.message : String(error)
      })
    );
  }
};
