// Cloudflare Worker (lives at the repo root, NOT inside /public).
// wrangler.jsonc sends only /api/* requests here; everything else is served from /public.
//   Form endpoints:
//   POST /api/quote      -> emails you the 3-step request through Brevo
//   POST /api/subscribe  -> adds the email to your Brevo newsletter list
//
// Set these in your Worker > Settings > Variables and secrets:
//   BREVO_API_KEY  (secret)  your Brevo API key
//   TO_EMAIL                 where requests arrive, e.g. cs@tguild.tech
//   FROM_EMAIL               a sender you verified in Brevo
//   BREVO_LIST_ID  (optional) numeric id of your newsletter list in Brevo

const TYPES = ["Business website", "Personal portfolio", "Not sure yet"];
const SIZES = ["Small", "Medium", "Large"];
const PACKS = ["GuildPack 1", "GuildPack 2", "GuildPack 3", "PersonalGuild Beginner", "PersonalGuild Intermediate", "PersonalGuild Advanced"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote" || url.pathname === "/api/subscribe") return handle(request, env, url);
    return env.ASSETS.fetch(request);
  }
};

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk = v => /^[+()\-\s\d]{8,20}$/.test(v) && v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15;
const pick = (v, list) => (list.includes(v) ? v : "-");

async function handle(request, env, url) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const origin = request.headers.get("Origin");
  if (origin) {
    try { if (new URL(origin).host !== url.host) return json({ error: "forbidden" }, 403); }
    catch (e) { return json({ error: "forbidden" }, 403); }
  }
  const raw = await request.text();
  if (raw.length > 4000) return json({ error: "too_large" }, 413);
  let b;
  try { b = JSON.parse(raw); } catch (e) { return json({ error: "bad_json" }, 400); }
  if (b && b.website) return json({ ok: true });            // honeypot: bots fill this in, people never see it
  if (!env.BREVO_API_KEY || !env.TO_EMAIL || !env.FROM_EMAIL) return json({ error: "not_configured" }, 503);
  return url.pathname === "/api/quote" ? quote(b, env) : subscribe(b, env);
}

async function brevo(env, path, body) {
  return fetch("https://api.brevo.com/v3" + path, {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body)
  });
}

async function addContact(env, email, name) {
  if (!env.BREVO_LIST_ID) return false;
  const r = await brevo(env, "/contacts", { email, attributes: name ? { FIRSTNAME: name } : {}, listIds: [Number(env.BREVO_LIST_ID)], updateEnabled: true });
  return r.status < 300;
}

async function notify(env, subject, rows, replyTo) {
  const html = '<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:15px">' +
    rows.map(r => "<tr><td><b>" + esc(r[0]) + "</b></td><td>" + esc(r[1]) + "</td></tr>").join("") + "</table>";
  const text = rows.map(r => r[0] + ": " + r[1]).join("\n");
  const body = { sender: { name: "[t]guild website", email: env.FROM_EMAIL }, to: [{ email: env.TO_EMAIL }], subject, htmlContent: html, textContent: text };
  if (replyTo) body.replyTo = { email: replyTo };
  return brevo(env, "/smtp/email", body);
}

async function quote(b, env) {
  const name = clean(b.name, 100), contact = clean(b.contact, 120);
  const isEmail = emailOk(contact);
  if (!name || (!isEmail && !phoneOk(contact))) return json({ error: "invalid" }, 400);
  const type = pick(b.type, TYPES), size = pick(b.size, SIZES), pack = pick(b.pack, PACKS), news = b.newsletter === true;
  const r = await notify(env, "New quote request: " + (pack !== "-" ? pack : type) + " - " + name, [
    ["Name", name], ["Contact", contact], ["Wants", type], ["Size", size], ["Suggested pack", pack],
    ["Newsletter", news ? "Yes" : "No"], ["Page language", clean(b.lang, 5) || "-"]
  ], isEmail ? contact : null);
  if (!r.ok) return json({ error: "email_failed" }, 502);
  if (news && isEmail) { try { await addContact(env, contact, name); } catch (e) { /* the request itself already reached you */ } }
  return json({ ok: true });
}

async function subscribe(b, env) {
  const email = clean(b.email, 120);
  if (!emailOk(email)) return json({ error: "invalid" }, 400);
  if (env.BREVO_LIST_ID) {
    const ok = await addContact(env, email, "");
    return ok ? json({ ok: true }) : json({ error: "subscribe_failed" }, 502);
  }
  const r = await notify(env, "New newsletter subscriber", [["Email", email], ["Page language", clean(b.lang, 5) || "-"]], email);
  return r.ok ? json({ ok: true }) : json({ error: "email_failed" }, 502);
}
