var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../utils/beautyShareContract.ts
var BEAUTY_MAX_BYTES = 20 * 1024 * 1024;
var BEAUTY_PLATFORMS = ["\u7CEF\u7C73\u673A\u7F8E\u5316\u7FA4", "\u7CEF\u7C73\u673A\u5B98\u65B9DC"];
function validateBeautyRepo(value) {
  if (!isRecord(value) || value.consent !== true) throw Error("\u8BF7\u540C\u610F\u5C06\u7F72\u540D\u4E0E\u53CD\u9988\u4EA4\u7ED9\u7BA1\u7406\u5458\uFF0C\u4EBA\u5DE5\u8F6C\u8FBE\u7ED9\u4F5C\u8005");
  if (!/^S-[A-F0-9]{12}$/.test(value.code) || !/^[a-f0-9]{32}$/.test(value.revision)) throw Error("\u7F8E\u5316\u4FE1\u606F\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u9886\u53D6");
  if (!/^[a-f0-9-]{32,64}$/.test(value.requestId) || !/^[a-f0-9-]{32,64}$/.test(value.deviceId)) throw Error("\u63D0\u4EA4\u6807\u8BC6\u65E0\u6548");
  return { code: value.code, revision: value.revision, requestId: value.requestId, deviceId: value.deviceId, signature: text(value.signature, "\u7F72\u540D", 60, true), message: text(value.message, "Repo", 1200, true), consent: true };
}
__name(validateBeautyRepo, "validateBeautyRepo");
var isRecord = /* @__PURE__ */ __name((value) => !!value && typeof value === "object" && !Array.isArray(value), "isRecord");
function text(value, label, max, required = false) {
  if (typeof value !== "string") throw Error(`${label}\u683C\u5F0F\u4E0D\u6B63\u786E`);
  const result = value.trim();
  if (result.length > max || required && !result) throw Error(`${label}${required ? "\u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u4E14" : ""}\u6700\u591A ${max} \u5B57`);
  return result;
}
__name(text, "text");
function validateBeautyMetadata(value) {
  if (!isRecord(value)) throw Error("\u5206\u4EAB\u8BF4\u660E\u683C\u5F0F\u4E0D\u6B63\u786E");
  if (!Array.isArray(value.platforms) || value.platforms.length < 1 || value.platforms.some((p) => !BEAUTY_PLATFORMS.includes(p))) throw Error("\u8BF7\u9009\u62E9\u53D1\u653E\u5E73\u53F0");
  if (typeof value.allowRemix !== "boolean" || typeof value.allowRedistribute !== "boolean") throw Error("\u8BF7\u8BBE\u7F6E\u4E8C\u6539\u548C\u4E8C\u6B21\u4F20\u64AD\u6743\u9650");
  if (value.bugFeedback !== "welcome" && value.bugFeedback !== "self-fix") throw Error("\u8BF7\u9009\u62E9\u53CD\u9988\u504F\u597D");
  return {
    name: text(value.name, "\u7F8E\u5316\u540D", 80, true),
    credit: text(value.credit, "\u7F72\u540D", 60, true),
    platforms: [...new Set(value.platforms)],
    contact: text(value.contact, "\u8054\u7CFB\u8BF4\u660E", 160),
    allowRemix: value.allowRemix,
    allowRedistribute: value.allowRedistribute,
    exportVersion: text(value.exportVersion, "\u5BFC\u51FA\u7248\u672C", 80, true),
    bugFeedback: value.bugFeedback,
    message: text(value.message, "\u4F5C\u8005\u7559\u8A00", 2e3)
  };
}
__name(validateBeautyMetadata, "validateBeautyMetadata");
function validateBeautyPackage(value) {
  if (!isRecord(value) || typeof value.name !== "string" || !value.name.trim() || value.name.length > 200) throw Error("\u8BF7\u63D0\u4EA4\u6709\u6548\u7684\u7F8E\u5316\u9884\u8BBE\u6587\u4EF6");
  if (value.format === "sullyos-chat-decoration" && value.version === 1 && isRecord(value.parts)) {
    const keys = Object.keys(value.parts);
    if (!keys.length || keys.some((key) => !["layout", "bubbles", "background", "sound", "css", "psyche", "schedule", "journal"].includes(key))) throw Error("\u804A\u5929\u88C5\u626E\u5305\u542B\u672A\u77E5\u5185\u5BB9");
    if ((keys.includes("schedule") || keys.includes("journal")) && keys.length !== 1) throw Error("App \u7F8E\u5316\u8BF7\u6309\u5206\u7C7B\u5206\u522B\u63D0\u4EA4");
    if (value.parts.css !== void 0 && typeof value.parts.css !== "string") throw Error("CSS \u683C\u5F0F\u4E0D\u6B63\u786E");
    return { kind: "chat-decoration", data: { format: value.format, version: 1, name: value.name, parts: value.parts } };
  }
  if (value.type === "sully_appearance_preset" && value.version === 1 && isRecord(value.theme)) {
    const data = { type: value.type, version: 1, name: value.name, theme: value.theme };
    for (const key of ["customIcons", "chatThemes", "chatLayout"]) if (value[key] !== void 0) data[key] = value[key];
    return { kind: "appearance", data };
  }
  throw Error("\u53EA\u652F\u6301\u804A\u5929\u88C5\u626E\u548C\u5916\u89C2\u9884\u8BBE\uFF0C\u4E0D\u63A5\u53D7\u89D2\u8272\u5361\u6216\u6574\u673A\u5907\u4EFD");
}
__name(validateBeautyPackage, "validateBeautyPackage");
function validateBeautyPassword(value) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) throw Error("\u5BC6\u7801\u9700\u4E3A 12\u2013128 \u4E2A\u5B57\u7B26\uFF0C\u8BF7\u52FF\u590D\u7528\u5176\u4ED6\u8D26\u53F7\u5BC6\u7801");
  return value;
}
__name(validateBeautyPassword, "validateBeautyPassword");

// src/auth.ts
var encoder = new TextEncoder();
var randomHex = /* @__PURE__ */ __name((length = 16) => Array.from(crypto.getRandomValues(new Uint8Array(length)), (n) => n.toString(16).padStart(2, "0")).join(""), "randomHex");
var sha256 = /* @__PURE__ */ __name(async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))), (n) => n.toString(16).padStart(2, "0")).join(""), "sha256");
function equal(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
__name(equal, "equal");
async function passwordHash(password, pepper, salt = randomHex()) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password + "\0" + pepper), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 1e5 }, key, 256);
  return salt + ":" + Array.from(new Uint8Array(bits), (n) => n.toString(16).padStart(2, "0")).join("");
}
__name(passwordHash, "passwordHash");
async function newSession(env, code, admin = false) {
  const token = randomHex(32);
  const expiresAt = Date.now() + (admin ? 8 * 36e5 : 30 * 864e5);
  await env.DB.prepare("INSERT INTO sessions(token_hash,author_code,expires_at) VALUES(?,?,?)").bind(await sha256(token), code, expiresAt).run();
  return { token, authorCode: code, expiresAt };
}
__name(newSession, "newSession");
async function identity(request, env) {
  const token = request.headers.get("Authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return null;
  return env.DB.prepare("SELECT a.code,a.role FROM sessions s JOIN authors a ON a.code=s.author_code WHERE s.token_hash=? AND s.expires_at>?").bind(await sha256(token), Date.now()).first();
}
__name(identity, "identity");

// src/index.ts
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
  static {
    __name(this, "HttpError");
  }
};
function fail(status, message) {
  throw new HttpError(status, message);
}
__name(fail, "fail");
var json = /* @__PURE__ */ __name((value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json; charset=utf-8" } }), "json");
var now = /* @__PURE__ */ __name(() => Date.now(), "now");
var positiveLimit = /* @__PURE__ */ __name((raw, fallback) => Number.isFinite(Number(raw)) && Number(raw) > 0 ? Number(raw) : fallback, "positiveLimit");
async function readJson(request, maxBytes) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) fail(415, "\u8BF7\u4F7F\u7528 JSON \u8BF7\u6C42");
  if (Number(request.headers.get("content-length")) > maxBytes) fail(413, "\u6587\u4EF6\u8FC7\u5927\uFF0C\u5206\u4EAB\u5305\u6700\u591A 20 MB");
  const reader = request.body?.getReader();
  if (!reader) fail(400, "\u8BF7\u6C42\u5185\u5BB9\u4E3A\u7A7A");
  const decoder = new TextDecoder();
  let size = 0;
  let text2 = "";
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      fail(413, "\u6587\u4EF6\u8FC7\u5927\uFF0C\u5206\u4EAB\u5305\u6700\u591A 20 MB");
    }
    text2 += decoder.decode(value, { stream: true });
  }
  text2 += decoder.decode();
  try {
    const value = JSON.parse(text2);
    if (!isRecord(value)) throw Error();
    return value;
  } catch {
    return fail(400, "JSON \u6587\u4EF6\u683C\u5F0F\u4E0D\u6B63\u786E");
  }
}
__name(readJson, "readJson");
async function limit(env, key, max, duration, amount = 1) {
  const window = Math.floor(now() / duration);
  const result = await env.DB.prepare(`INSERT INTO limits(key,value,expires_at) VALUES(?,?,?)
    ON CONFLICT(key) DO UPDATE SET value=value+excluded.value WHERE value+excluded.value<=?
    RETURNING value`).bind(`${key}:${window}`, amount, (window + 1) * duration, max).first();
  if (!result || amount > max) fail(429, "\u64CD\u4F5C\u8FC7\u4E8E\u9891\u7E41\u6216\u4ECA\u65E5\u4E0A\u4F20\u989D\u5EA6\u5DF2\u6EE1\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
}
__name(limit, "limit");
async function principal(request, env, role) {
  const who = await identity(request, env);
  if (!who) fail(401, "\u767B\u5F55\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
  if (who.role !== role) fail(403, "\u6CA1\u6709\u6B64\u64CD\u4F5C\u6743\u9650");
  return who;
}
__name(principal, "principal");
var toSubmission = /* @__PURE__ */ __name((row, admin = false) => ({
  id: row.id,
  kind: row.kind,
  shareCode: row.share_code,
  publishedRevision: row.published_revision,
  pendingRevision: row.pending_revision,
  latestRevision: row.latest_revision,
  status: row.status,
  metadata: JSON.parse(row.metadata),
  reviewNote: row.review_note,
  updatedAt: row.updated_at,
  ...admin ? { authorCode: row.author_code } : {}
}), "toSubmission");
var selectSubmission = `SELECT s.*,r.status,r.metadata,r.review_note FROM submissions s JOIN revisions r ON r.id=s.latest_revision`;
var PAGE_SIZE = 12;
function pageOffset(url) {
  return Math.min(1e5, Math.max(0, Math.floor(Number(url.searchParams.get("offset")) || 0)));
}
__name(pageOffset, "pageOffset");
async function listSubmissions(env, url, author) {
  const status = url.searchParams.get("status") || (author ? "all" : "pending");
  if (!["pending", "approved", "rejected", "all"].includes(status)) fail(400, "\u72B6\u6001\u65E0\u6548");
  const search = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const clauses = ["s.deleted_at IS NULL"];
  const args = [];
  if (author) {
    clauses.push("s.author_code=?");
    args.push(author);
  }
  if (status !== "all") {
    clauses.push("r.status=?");
    args.push(status);
  }
  if (search) {
    clauses.push("(instr(lower(json_extract(r.metadata,'$.name')),lower(?))>0 OR instr(lower(s.author_code),lower(?))>0 OR instr(lower(COALESCE(s.share_code,'')),lower(?))>0)");
    args.push(search, search, search);
  }
  const where = " WHERE " + clauses.join(" AND ");
  const count = await env.DB.prepare("SELECT count(*) AS n FROM submissions s JOIN revisions r ON r.id=s.latest_revision" + where).bind(...args).first();
  const total = Number(count?.n || 0);
  const offset = Math.min(pageOffset(url), Math.max(0, Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE);
  const { results } = await env.DB.prepare(selectSubmission + where + " ORDER BY s.updated_at DESC,s.id DESC LIMIT ? OFFSET ?").bind(...args, PAGE_SIZE, offset).all();
  return json({ submissions: results.map((row) => toSubmission(row, !author)), total, offset, pageSize: PAGE_SIZE, nextOffset: offset + PAGE_SIZE < total ? offset + PAGE_SIZE : null });
}
__name(listSubmissions, "listSubmissions");
async function submit(request, env, author, id) {
  if (env.UPLOADS_ENABLED !== "true") fail(503, "\u6295\u7A3F\u6682\u672A\u5F00\u653E\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
  await limit(env, `upload:${author}`, 6, 36e5);
  const body = await readJson(request, BEAUTY_MAX_BYTES + 16384);
  let metadata, pack;
  try {
    metadata = validateBeautyMetadata(body.metadata);
    pack = validateBeautyPackage(body.package);
  } catch (error) {
    return fail(400, error.message);
  }
  const content = JSON.stringify(pack.data);
  const bytes = new TextEncoder().encode(content).byteLength;
  if (bytes > BEAUTY_MAX_BYTES) fail(413, "\u5206\u4EAB\u5305\u6700\u591A 20 MB");
  const workId = id || randomHex();
  if (id) {
    const work = await env.DB.prepare("SELECT * FROM submissions WHERE id=? AND author_code=? AND deleted_at IS NULL").bind(id, author).first();
    if (!work) fail(404, "\u4F5C\u54C1\u4E0D\u5B58\u5728");
    if (work.kind !== pack.kind) fail(400, "\u66F4\u65B0\u5FC5\u987B\u4E0E\u539F\u4F5C\u54C1\u7C7B\u578B\u76F8\u540C");
    if (work.pending_revision) fail(409, "\u5DF2\u6709\u5F85\u5BA1\u7248\u672C\uFF0C\u8BF7\u7B49\u5F85\u5BA1\u6838\u540E\u518D\u66F4\u65B0");
    if (body.expectedRevision !== work.latest_revision) fail(409, "\u4F5C\u54C1\u72B6\u6001\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
  } else {
    const count = await env.DB.prepare("SELECT count(*) AS n FROM submissions WHERE author_code=? AND deleted_at IS NULL").bind(author).first();
    if (Number(count?.n) >= 50) fail(429, "\u6BCF\u4F4D\u4F5C\u8005\u6700\u591A\u4FDD\u7559 50 \u4EFD\u4F5C\u54C1");
  }
  await limit(env, "upload-bytes", positiveLimit(env.DAILY_UPLOAD_BYTES, 256 * 1024 * 1024), 864e5, bytes);
  const capacity = positiveLimit(env.TOTAL_STORAGE_BYTES, 8 * 1024 ** 3);
  if (bytes > capacity) fail(507, "\u5B58\u50A8\u989D\u5EA6\u5DF2\u6EE1\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
  const reserved = await env.DB.prepare(`INSERT INTO limits(key,value,expires_at) VALUES('storage',?,0)
    ON CONFLICT(key) DO UPDATE SET value=value+excluded.value WHERE value+excluded.value<=? RETURNING value`).bind(bytes, capacity).first();
  if (!reserved) fail(507, "\u5B58\u50A8\u989D\u5EA6\u5DF2\u6EE1\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
  const revision = randomHex();
  const blobKey = `packages/${workId}/${revision}.json`;
  const hash = await sha256(content);
  try {
    await env.FILES.put(blobKey, content, { httpMetadata: { contentType: "application/json" } });
    if (!id) {
      await env.DB.prepare("INSERT INTO submissions(id,author_code,kind,created_at,updated_at) VALUES(?,?,?,?,?)").bind(workId, author, pack.kind, now(), now()).run();
    }
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO revisions(id,submission_id,metadata,blob_key,bytes,sha256,status,created_at)
        SELECT ?,id,?,?,?,?,'pending',? FROM submissions WHERE id=? AND author_code=? AND deleted_at IS NULL
        AND pending_revision IS NULL AND COALESCE(latest_revision,'')=?`).bind(revision, JSON.stringify(metadata), blobKey, bytes, hash, now(), workId, author, id ? body.expectedRevision : ""),
      env.DB.prepare(`UPDATE submissions SET pending_revision=?,latest_revision=?,updated_at=?
        WHERE id=? AND EXISTS(SELECT 1 FROM revisions WHERE id=?)`).bind(revision, revision, now(), workId, revision)
    ]);
    if (!results[0].meta.changes) fail(409, "\u4F5C\u54C1\u72B6\u6001\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
  } catch (error) {
    await env.FILES.delete(blobKey);
    await env.DB.prepare("UPDATE limits SET value=MAX(0,value-?) WHERE key='storage'").bind(bytes).run();
    if (!id) await env.DB.prepare("DELETE FROM submissions WHERE id=? AND latest_revision IS NULL").bind(workId).run();
    throw error;
  }
  return json({ id: workId, revision, status: "pending" }, 201);
}
__name(submit, "submit");
async function remove(env, id, author) {
  const row = await env.DB.prepare(`SELECT id FROM submissions WHERE id=? AND deleted_at IS NULL${author ? " AND author_code=?" : ""}`).bind(...author ? [id, author] : [id]).first();
  if (!row) fail(404, "\u4F5C\u54C1\u4E0D\u5B58\u5728");
  await env.DB.batch([
    env.DB.prepare("UPDATE submissions SET deleted_at=?,updated_at=?,pending_revision=NULL,published_revision=NULL WHERE id=?").bind(now(), now(), id),
    env.DB.prepare("UPDATE revisions SET status='withdrawn' WHERE submission_id=? AND status='pending'").bind(id)
  ]);
  try {
    await cleanup(env);
  } catch {
  }
  return json({ deleted: true });
}
__name(remove, "remove");
async function cleanup(env) {
  const { results } = await env.DB.prepare(`SELECT r.id,r.blob_key,r.bytes FROM revisions r JOIN submissions s ON s.id=r.submission_id
    WHERE r.blob_key!='' AND (s.deleted_at IS NOT NULL OR (r.id!=COALESCE(s.published_revision,'')
    AND r.id!=COALESCE(s.pending_revision,'') AND r.id!=COALESCE(s.latest_revision,''))) LIMIT 100`).all();
  for (const row of results) {
    await env.FILES.delete(row.blob_key);
    await env.DB.batch([
      env.DB.prepare("UPDATE limits SET value=MAX(0,value-?) WHERE key='storage' AND EXISTS(SELECT 1 FROM revisions WHERE id=? AND blob_key!='')").bind(row.bytes, row.id),
      env.DB.prepare("UPDATE revisions SET blob_key='' WHERE id=?").bind(row.id)
    ]);
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(now()),
    env.DB.prepare("DELETE FROM limits WHERE expires_at>0 AND expires_at<?").bind(now())
  ]);
}
__name(cleanup, "cleanup");
async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path === "/health") return json({ ok: true, uploadsEnabled: env.UPLOADS_ENABLED === "true" });
  if (path === "/admin" || path.startsWith("/admin/")) {
    const assetPath = path === "/admin" || path === "/admin/" ? "/" : path.slice("/admin".length);
    return env.ASSETS.fetch(new Request(new URL(assetPath, request.url), request));
  }
  if (path === "/") return new Response("SullyOS \u7F8E\u5316\u5206\u4EAB\u670D\u52A1\u3002\u8BF7\u5728\u7CEF\u7C73\u673A\u4E2D\u8F93\u5165\u7F8E\u5316\u7801\u3002");
  if (!path.startsWith("/api/")) fail(404, "\u4E0D\u5B58\u5728\u7684\u63A5\u53E3");
  if (!env.AUTH_PEPPER || env.AUTH_PEPPER.length < 32) fail(503, "\u670D\u52A1\u5C1A\u672A\u5B8C\u6210\u914D\u7F6E");
  if (path.startsWith("/api/admin/") && request.headers.get("Origin") && request.headers.get("Origin") !== url.origin) fail(403, "\u8BF7\u4ECE\u7BA1\u7406\u5458\u9875\u9762\u64CD\u4F5C");
  const ip = await sha256(env.AUTH_PEPPER + ":" + (request.headers.get("CF-Connecting-IP") || "local"));
  await limit(env, `requests:${ip}`, 180, 6e4);
  if (method === "POST" && path === "/api/admin/setup") {
    const body = await readJson(request, 4096);
    if (!env.BOOTSTRAP_HASH || typeof body.token !== "string" || !equal(await sha256(body.token), env.BOOTSTRAP_HASH)) fail(403, "\u521D\u59CB\u5316\u51ED\u636E\u65E0\u6548");
    if (await env.DB.prepare("SELECT code FROM authors WHERE role='admin'").first()) fail(409, "\u7BA1\u7406\u5458\u5DF2\u5EFA\u7ACB\uFF0C\u8BF7\u76F4\u63A5\u767B\u5F55");
    if (typeof body.username !== "string" || !/^[a-zA-Z0-9_-]{3,40}$/.test(body.username)) fail(400, "\u7BA1\u7406\u5458\u8D26\u53F7\u9700\u4E3A 3\u201340 \u4F4D\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u4E0B\u5212\u7EBF\u6216\u77ED\u6A2A\u7EBF");
    let password;
    try {
      password = validateBeautyPassword(body.password);
    } catch (error) {
      return fail(400, error.message);
    }
    const code = "admin:" + body.username;
    await env.DB.prepare("INSERT INTO authors(code,role,password_hash,created_at) VALUES(?,?,?,?)").bind(code, "admin", await passwordHash(password, env.AUTH_PEPPER), now()).run();
    return json(await newSession(env, code, true));
  }
  if (method === "POST" && path === "/api/auth/register") {
    if (env.UPLOADS_ENABLED !== "true") fail(503, "\u6295\u7A3F\u6682\u672A\u5F00\u653E");
    await limit(env, `register:${ip}`, 3, 864e5);
    const body = await readJson(request, 4096);
    let password;
    try {
      password = validateBeautyPassword(body.password);
    } catch (error) {
      return fail(400, error.message);
    }
    const code = "A-" + randomHex(8).toUpperCase();
    await env.DB.prepare("INSERT INTO authors(code,role,password_hash,created_at) VALUES(?,?,?,?)").bind(code, "author", await passwordHash(password, env.AUTH_PEPPER), now()).run();
    return json(await newSession(env, code), 201);
  }
  if (method === "POST" && (path === "/api/auth/login" || path === "/api/admin/login")) {
    await limit(env, `login:${ip}`, 12, 6e5);
    const body = await readJson(request, 4096);
    const admin = path === "/api/admin/login";
    const code = admin ? "admin:" + String(body.username || "") : String(body.authorCode || "").trim().toUpperCase();
    if (code.length > 80 || typeof body.password !== "string" || body.password.length > 128) fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
    await limit(env, `login-code:${await sha256(code)}`, 25, 6e5);
    const row = await env.DB.prepare("SELECT * FROM authors WHERE code=? AND role=?").bind(code, admin ? "admin" : "author").first();
    const hash = await passwordHash(body.password, env.AUTH_PEPPER, row?.password_hash.split(":")[0] || "00000000000000000000000000000000");
    if (!row || !equal(hash, row.password_hash)) fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
    return json(await newSession(env, code, admin));
  }
  if (method === "POST" && path === "/api/auth/logout") {
    const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") || "";
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
    return json({ ok: true });
  }
  if (path === "/api/submissions") {
    const who = await principal(request, env, "author");
    if (method === "POST") return submit(request, env, who.code);
    if (method === "GET") {
      return listSubmissions(env, url, who.code);
    }
  }
  const workMatch = path.match(/^\/api\/submissions\/([a-f0-9]{32})$/);
  if (workMatch) {
    const who = await principal(request, env, "author");
    if (method === "POST") return submit(request, env, who.code, workMatch[1]);
    if (method === "DELETE") return remove(env, workMatch[1], who.code);
  }
  const fileMatch = path.match(/^\/api\/revisions\/([a-f0-9]{32})\/file$/);
  if (fileMatch && method === "GET") {
    const who = await identity(request, env);
    if (!who) fail(401, "\u8BF7\u5148\u767B\u5F55");
    const row = await env.DB.prepare(`SELECT r.* FROM revisions r JOIN submissions s ON s.id=r.submission_id
      WHERE r.id=? AND s.deleted_at IS NULL AND (s.author_code=? OR ?='admin') AND r.blob_key!=''`).bind(fileMatch[1], who.code, who.role).first();
    if (!row) fail(404, "\u6587\u4EF6\u4E0D\u5B58\u5728");
    return download(env, row);
  }
  if (path === "/api/admin/submissions" && method === "GET") {
    await principal(request, env, "admin");
    return listSubmissions(env, url);
  }
  if (path === "/api/repos" && method === "POST") {
    let body;
    try {
      body = validateBeautyRepo(await readJson(request, 8192));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      return fail(400, error.message);
    }
    const requestKey = await sha256(env.AUTH_PEPPER + ":" + body.deviceId + ":" + body.requestId);
    const existing = await env.DB.prepare("SELECT id FROM beauty_repos WHERE request_key=?").bind(requestKey).first();
    if (existing) return json({ id: existing.id, received: true });
    const work = await env.DB.prepare(`SELECT s.id,r.metadata FROM submissions s JOIN revisions r ON r.submission_id=s.id
      WHERE s.share_code=? AND s.deleted_at IS NULL AND s.published_revision IS NOT NULL AND r.id=? AND r.status='approved'`).bind(body.code, body.revision).first();
    if (!work) fail(404, "\u8FD9\u4EFD\u7F8E\u5316\u5DF2\u505C\u6B62\u5206\u4EAB\uFF0C\u6682\u4E0D\u80FD\u4EE3\u6536 Repo");
    await limit(env, `repo-ip:${ip}`, 5, 864e5);
    await limit(env, `repo-device:${await sha256(env.AUTH_PEPPER + body.deviceId)}`, 3, 864e5);
    await limit(env, "repo-global", 1e3, 864e5);
    const id = randomHex();
    await env.DB.prepare(`INSERT INTO beauty_repos(id,request_key,submission_id,revision_id,metadata,signature,message,created_at)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING`).bind(id, requestKey, work.id, body.revision, work.metadata, body.signature, body.message, now()).run();
    const saved = await env.DB.prepare("SELECT id FROM beauty_repos WHERE request_key=?").bind(requestKey).first();
    return json({ id: saved?.id, received: true }, 201);
  }
  if (path === "/api/admin/repos" && method === "GET") {
    await principal(request, env, "admin");
    const status = url.searchParams.get("status") || "pending";
    if (!["pending", "sent", "archived", "all"].includes(status)) fail(400, "\u72B6\u6001\u65E0\u6548");
    const search = (url.searchParams.get("q") || "").trim().slice(0, 80);
    const clauses = ["1=1"];
    const args = [];
    if (status !== "all") {
      clauses.push("f.status=?");
      args.push(status);
    }
    if (search) {
      clauses.push("(instr(lower(s.author_code),lower(?))>0 OR instr(lower(s.share_code),lower(?))>0 OR instr(lower(json_extract(f.metadata,'$.name')),lower(?))>0)");
      args.push(search, search, search);
    }
    const from = " FROM beauty_repos f JOIN submissions s ON s.id=f.submission_id WHERE " + clauses.join(" AND ");
    const count = await env.DB.prepare("SELECT count(*) AS n" + from).bind(...args).first();
    const total = Number(count?.n || 0);
    const offset = Math.min(pageOffset(url), Math.max(0, Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE);
    const { results } = await env.DB.prepare("SELECT f.id,f.signature,f.message,f.status,f.created_at,f.metadata,s.author_code,s.share_code" + from + " ORDER BY f.created_at DESC,f.id DESC LIMIT ? OFFSET ?").bind(...args, PAGE_SIZE, offset).all();
    return json({ repos: results.map((row) => ({ ...row, metadata: JSON.parse(row.metadata) })), total, offset, pageSize: PAGE_SIZE, nextOffset: offset + PAGE_SIZE < total ? offset + PAGE_SIZE : null });
  }
  const repoStatus = path.match(/^\/api\/admin\/repos\/([a-f0-9]{32})$/);
  if (repoStatus && method === "POST") {
    await principal(request, env, "admin");
    const body = await readJson(request, 1024);
    if (!["pending", "sent", "archived"].includes(body.status)) fail(400, "\u72B6\u6001\u65E0\u6548");
    const result = await env.DB.prepare("UPDATE beauty_repos SET status=?,handled_at=? WHERE id=?").bind(body.status, body.status === "pending" ? null : now(), repoStatus[1]).run();
    if (!result.meta.changes) fail(404, "Repo \u4E0D\u5B58\u5728");
    return json({ ok: true });
  }
  const review = path.match(/^\/api\/admin\/revisions\/([a-f0-9]{32})\/review$/);
  if (review && method === "POST") {
    await principal(request, env, "admin");
    const body = await readJson(request, 4096);
    if (!["approved", "rejected"].includes(body.decision) || typeof body.note !== "string" || body.note.length > 1e3 || body.decision === "rejected" && !body.note.trim()) fail(400, "\u8BF7\u9009\u62E9\u5BA1\u6838\u7ED3\u679C\uFF1B\u9000\u56DE\u9700\u8981\u586B\u5199\u539F\u56E0\uFF08\u6700\u591A 1000 \u5B57\uFF09");
    const revision = review[1];
    const code = "S-" + randomHex(6).toUpperCase();
    const results = await env.DB.batch([
      env.DB.prepare(`UPDATE revisions SET status=?,review_note=?,reviewed_at=? WHERE id=? AND status='pending'
        AND EXISTS(SELECT 1 FROM submissions WHERE pending_revision=? AND deleted_at IS NULL)`).bind(body.decision, body.note.trim(), now(), revision, revision),
      env.DB.prepare(`UPDATE submissions SET pending_revision=NULL,updated_at=?,
        published_revision=CASE WHEN ?='approved' THEN ? ELSE published_revision END,
        share_code=CASE WHEN ?='approved' THEN COALESCE(share_code,?) ELSE share_code END
        WHERE pending_revision=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM revisions WHERE id=? AND status=?)`).bind(now(), body.decision, revision, body.decision, code, revision, revision, body.decision)
    ]);
    if (!results[0].meta.changes) fail(409, "\u8FD9\u4EFD\u63D0\u4EA4\u5DF2\u5904\u7406\u6216\u88AB\u5220\u9664\uFF0C\u8BF7\u5237\u65B0\u5217\u8868");
    return json({ ok: true });
  }
  const adminDelete = path.match(/^\/api\/admin\/submissions\/([a-f0-9]{32})$/);
  if (adminDelete && method === "DELETE") {
    await principal(request, env, "admin");
    return remove(env, adminDelete[1]);
  }
  const share = path.match(/^\/api\/shares\/(S-[A-F0-9]{12})(\/file)?$/);
  if (share && method === "GET") {
    const row = await env.DB.prepare(`SELECT r.*,s.kind,s.share_code FROM submissions s JOIN revisions r ON r.id=s.published_revision
      WHERE s.share_code=? AND s.deleted_at IS NULL AND r.status='approved'`).bind(share[1]).first();
    if (!row) fail(404, "\u7F8E\u5316\u7801\u4E0D\u5B58\u5728\u6216\u5DF2\u505C\u6B62\u5206\u4EAB");
    if (share[2]) {
      if (url.searchParams.get("revision") !== row.id) fail(409, "\u4F5C\u8005\u521A\u521A\u66F4\u65B0\u4E86\u4F5C\u54C1\uFF0C\u8BF7\u91CD\u65B0\u67E5\u770B\u8BF4\u660E\u540E\u9886\u53D6");
      return download(env, row);
    }
    return json({ code: row.share_code, kind: row.kind, revision: row.id, metadata: JSON.parse(row.metadata), bytes: row.bytes, sha256: row.sha256 });
  }
  return fail(404, "\u4E0D\u5B58\u5728\u7684\u63A5\u53E3");
}
__name(route, "route");
async function download(env, row) {
  const object = await env.FILES.get(row.blob_key);
  if (!object) fail(404, "\u6587\u4EF6\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
  return new Response(object.body, { headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="beauty-${row.id}.json"`,
    "Content-Length": String(object.size),
    "X-Content-SHA256": row.sha256
  } });
}
__name(download, "download");
var index_default = {
  async fetch(request, env) {
    let response;
    try {
      response = request.method === "OPTIONS" ? new Response(null, { status: 204 }) : await route(request, env);
    } catch (error) {
      response = json({ error: error instanceof HttpError ? error.message : "\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" }, error instanceof HttpError ? error.status : 500);
    }
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
    headers.set("Access-Control-Expose-Headers", "X-Content-SHA256");
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_event, env) {
    await cleanup(env);
  }
};
export {
  cleanup,
  index_default as default
};
//# sourceMappingURL=index.js.map
