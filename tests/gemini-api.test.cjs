"use strict";
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/analizar.js");
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB9sAAAAASUVORK5CYII=";
const body = { imagen: PNG, tipo: "image/png" };
const saved = { fetch: global.fetch, gemini: process.env.GEMINI_API_KEY, google: process.env.GOOGLE_API_KEY, env: process.env.VERCEL_ENV };
let calls;
beforeEach(() => {
  calls = [];
  process.env.GEMINI_API_KEY = "fake-test-key-do-not-use";
  delete process.env.GOOGLE_API_KEY;
  process.env.VERCEL_ENV = "preview";
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => answer("Residuo reciclable.") };
  };
});
afterEach(() => {
  global.fetch = saved.fetch;
  for (const [key, value] of [["GEMINI_API_KEY", saved.gemini], ["GOOGLE_API_KEY", saved.google], ["VERCEL_ENV", saved.env]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function answer(text, finishReason = "STOP") {
  return { candidates: [{ finishReason, content: { parts: [{ text }] } }] };
}
function response() {
  return { statusCode: 200, headers: {}, data: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.data = value; return this; }
  };
}
async function call(value = body, method = "POST") {
  const res = response();
  await handler({ method, body: value }, res);
  assert.equal(res.headers["cache-control"], "no-store");
  return res;
}
function upstream(status, data) {
  global.fetch = async () => ({ ok: status < 400, status, json: async () => data });
}

test("scanner uses EXACTLY gemini-2.5-flash and keeps the old JSON contract", async () => {
  const res = await call();
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.resultado, "Residuo reciclable.");
  assert.equal(res.data.modelo, "gemini-2.5-flash");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
  assert.equal(calls[0].options.headers["x-goog-api-key"], "fake-test-key-do-not-use");
  assert.ok(!calls[0].url.includes("fake-test-key"));
  const sent = JSON.parse(calls[0].options.body);
  assert.deepEqual(sent.contents[0].parts[1].inlineData, { mimeType: "image/png", data: PNG });
  assert.equal(sent.generationConfig.thinkingConfig.thinkingBudget, 0);
});
test("GET diagnostic does not call Gemini or expose credentials", async () => {
  const res = await call(null, "GET");
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.configured, true);
  assert.equal(res.data.environment, "preview");
  assert.equal(res.data.release, "gemini-25-fix-1");
  assert.ok(!JSON.stringify(res).includes("fake-test-key"));
  assert.equal(calls.length, 0);
});
test("missing secret reports the correct environment without pretending to work", async () => {
  delete process.env.GEMINI_API_KEY;
  process.env.VERCEL_ENV = "production";
  const res = await call();
  assert.equal(res.statusCode, 503);
  assert.equal(res.data.code, "GEMINI_NOT_CONFIGURED");
  assert.match(res.data.error, /production/);
  assert.equal(calls.length, 0);
  assert.equal((await call(null, "GET")).data.configured, false);
});
test("GOOGLE_API_KEY server-side fallback supports existing deployments", async () => {
  process.env.GEMINI_API_KEY = "   ";
  process.env.GOOGLE_API_KEY = "  alternate-test-key  ";
  assert.equal((await call()).statusCode, 200);
  assert.equal(calls[0].options.headers["x-goog-api-key"], "alternate-test-key");
});
test("canonical key takes precedence; pasted wrapping quotes are removed", async () => {
  process.env.GEMINI_API_KEY = '  "canonical-test-key"  ';
  process.env.GOOGLE_API_KEY = "other-test-key";
  await call();
  assert.equal(calls[0].options.headers["x-goog-api-key"], "canonical-test-key");
});
for (const method of ["PUT", "DELETE", "OPTIONS"]) test("rejects unsupported method " + method, async () => {
  const res = await call(body, method);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "GET, POST");
  assert.equal(calls.length, 0);
});
for (const [name, value, code] of [
  ["malformed JSON", "{bad", "INVALID_JSON"],
  ["array body", [], "INVALID_BODY"],
  ["null body", null, "INVALID_BODY"],
  ["SVG uploads", { ...body, tipo: "image/svg+xml" }, "INVALID_IMAGE"],
  ["empty image", { ...body, imagen: "" }, "INVALID_IMAGE"],
  ["invalid base64", { ...body, imagen: "!!!!" }, "INVALID_IMAGE"],
  ["noncanonical base64", { ...body, imagen: "Zh==" }, "INVALID_IMAGE"],
  ["unknown action", { ...body, accion: "other" }, "UNKNOWN_ACTION"],
  ["prototype mission", { ...body, accion: "verificar_mision", mision: "__proto__" }, "UNKNOWN_MISSION"]
]) test("rejects " + name + " before calling Google", async () => {
  const res = await call(value);
  assert.equal(res.statusCode, 400);
  assert.equal(res.data.code, code);
  assert.equal(calls.length, 0);
});
test("supports an object, JSON string and Buffer request body", async () => {
  assert.equal((await call(JSON.stringify(body))).statusCode, 200);
  assert.equal((await call(Buffer.from(JSON.stringify(body)))).statusCode, 200);
});
test("caps uploads at 3 MiB before sending to Google", async () => {
  const res = await call({ ...body, imagen: "A".repeat(4 * 1024 * 1024 + 4) });
  assert.equal(res.statusCode, 413);
  assert.equal(calls.length, 0);
});
for (const mision of ["reciclaje", "agua", "planta"]) test("mission " + mision + " uses a JSON schema and a real boolean", async () => {
  global.fetch = async (url, options) => {
    const sent = JSON.parse(options.body);
    assert.equal(sent.generationConfig.responseMimeType, "application/json");
    assert.deepEqual(sent.generationConfig.responseSchema.required, ["aprobado", "mensaje"]);
    return { ok: true, status: 200, json: async () => answer('{"aprobado":true,"mensaje":"Evidencia suficiente."}') };
  };
  const res = await call({ ...body, accion: "verificar_mision", mision });
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.aprobado, true);
  assert.equal(res.data.mensaje, "Evidencia suficiente.");
});
for (const text of ['not JSON', '{"aprobado":"true","mensaje":"ok"}', '{"aprobado":true}', '{"aprobado":true,"mensaje":""}']) {
  test("invalid mission output never awards points: " + text, async () => {
    upstream(200, answer(text));
    const res = await call({ ...body, accion: "verificar_mision", mision: "planta" });
    assert.equal(res.statusCode, 502);
    assert.equal(res.data.code, "GEMINI_INVALID_RESULT");
    assert.notEqual(res.data.aprobado, true);
  });
}
test("valid rejected mission stays rejected", async () => {
  upstream(200, answer('{"aprobado":false,"mensaje":"Falta evidencia."}'));
  const res = await call({ ...body, accion: "verificar_mision", mision: "agua" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.aprobado, false);
});
for (const [status, code] of [[401,"GEMINI_KEY_INVALID"],[403,"GEMINI_PERMISSION_DENIED"],[404,"GEMINI_MODEL_UNAVAILABLE"],[429,"GEMINI_QUOTA_EXCEEDED"],[402,"GEMINI_BILLING_REQUIRED"],[400,"GEMINI_REQUEST_REJECTED"],[503,"GEMINI_UPSTREAM_ERROR"]]) {
  test("separates provider HTTP " + status + " from missing configuration", async () => {
    upstream(status, { error: { message: "private-provider-details fake-test-key-do-not-use" } });
    const res = await call();
    assert.equal(res.statusCode, status === 429 ? 429 : 502);
    assert.equal(res.data.code, code);
    assert.ok(!JSON.stringify(res).includes("private-provider-details"));
    assert.ok(!JSON.stringify(res).includes("fake-test-key"));
  });
}
test("recognizes an invalid key carried in HTTP 400 details", async () => {
  upstream(400, { error: { details: [{ reason: "API_KEY_INVALID" }] } });
  assert.equal((await call()).data.code, "GEMINI_KEY_INVALID");
});
test("non-JSON provider response has a useful error", async () => {
  global.fetch = async () => ({ ok: false, status: 503, json: async () => { throw new SyntaxError("HTML"); } });
  assert.equal((await call()).data.code, "GEMINI_UPSTREAM_ERROR");
});
for (const [name, value, code] of [
  ["empty response", {}, "GEMINI_EMPTY"],
  ["blocked prompt", { promptFeedback: { blockReason: "SAFETY" } }, "GEMINI_BLOCKED"],
  ["blocked candidate", answer("partial", "SAFETY"), "GEMINI_BLOCKED"],
  ["truncated response", answer("partial", "MAX_TOKENS"), "GEMINI_INCOMPLETE"]
]) test("handles " + name, async () => {
  upstream(200, value);
  assert.equal((await call()).data.code, code);
});
test("thought parts are not sent to the browser", async () => {
  upstream(200, { candidates: [{ content: { parts: [{ thought: true, text: "internal" }, { text: "Respuesta final" }] } }] });
  assert.equal((await call()).data.resultado, "Respuesta final");
});
test("network errors do not leak exception details", async () => {
  global.fetch = async () => { throw new Error("secret request data"); };
  const res = await call();
  assert.equal(res.data.code, "GEMINI_NETWORK_ERROR");
  assert.ok(!JSON.stringify(res).includes("secret request data"));
});
test("45-second abort is enforced and reported, not left hanging", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
  const result = call();
  t.mock.timers.tick(45000);
  const res = await result;
  assert.equal(res.statusCode, 504);
  assert.equal(res.data.code, "GEMINI_TIMEOUT");
});
