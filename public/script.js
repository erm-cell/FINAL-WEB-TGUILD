// ---- SETUP ----
// Both endpoints are served by _worker.js (Cloudflare Pages), which emails you through Brevo.
// If they are not available (for example on a plain static host), the form falls back to WhatsApp.
const QUOTE_ENDPOINT = "/api/quote";
const NEWSLETTER_ENDPOINT = "/api/subscribe";
const WHATSAPP = "6283177610112";
const EMAIL = "cs@tguild.tech";
// ---------------

const T = {
  en: {
    nameBad: "Please tell us your name.",
    contactBad: "Please enter a valid email or WhatsApp number.",
    sending: "Sending…",
    send: "Send my request",
    fail: "Sorry, that didn’t send.",
    waLink: "Message us on WhatsApp instead",
    hi: (n, t, p, c) => `Hi [t]guild! I'm ${n}. I'm interested in: ${t}, ${p}. You can reach me at ${c}.`,
    chip: p => `We’ll quote: ${p}`,
    newsBad: "Please enter a valid email address.",
    newsOk: "You’re subscribed. Welcome!",
    newsFail: "Sorry, we couldn’t subscribe you. Please try again or email " + EMAIL + "."
  },
  id: {
    nameBad: "Mohon isi nama Anda.",
    contactBad: "Mohon isi email atau nomor WhatsApp yang valid.",
    sending: "Mengirim…",
    send: "Kirim permintaan",
    fail: "Maaf, permintaan belum terkirim.",
    waLink: "Hubungi kami lewat WhatsApp",
    hi: (n, t, p, c) => `Halo [t]guild! Saya ${n}. Saya tertarik dengan: ${t}, ${p}. Anda bisa menghubungi saya di ${c}.`,
    chip: p => `Kami akan menawarkan: ${p}`,
    newsBad: "Mohon masukkan alamat email yang valid.",
    newsOk: "Anda sudah berlangganan. Selamat datang!",
    newsFail: "Maaf, kami belum bisa mendaftarkan Anda. Coba lagi atau kirim email ke " + EMAIL + "."
  }
};
const L = T[document.documentElement.lang === "id" ? "id" : "en"];
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk = v => /^[+()\-\s\d]{8,20}$/.test(v) && v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15;
const show = (el, text, ok) => { el.textContent = text; el.className = "msg " + (ok ? "ok" : "err"); };
const bad = (input, el, text) => { input.setAttribute("aria-invalid", "true"); input.focus(); show(el, text, false); };
document.addEventListener("input", e => { if (e.target.getAttribute && e.target.getAttribute("aria-invalid")) e.target.removeAttribute("aria-invalid"); });

async function post(url, data) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error("failed");
}

/* ---------- 3-step quote form ---------- */
(function () {
  const f = document.getElementById("quoteForm");
  if (!f) return;
  const PK = {
    business: { small: "GuildPack 1", medium: "GuildPack 2", large: "GuildPack 3" },
    personal: { small: "PersonalGuild Beginner", medium: "PersonalGuild Intermediate", large: "PersonalGuild Advanced" }
  };
  const TN = { business: "Business website", personal: "Personal portfolio", unsure: "Not sure yet" };
  const SZ = { small: "Small", medium: "Medium", large: "Large" };
  const st = { type: "", size: "" };
  let step = 1;
  const sets = f.querySelectorAll(".qs"), dots = f.querySelectorAll(".qdots i"), stepEl = f.querySelector(".qstep"), chip = f.querySelector(".qchip"), msg = document.getElementById("formMsg");
  const stepText = stepEl.dataset.t;

  const pack = () => (PK[st.type === "personal" ? "personal" : "business"] || {})[st.size] || "";

  function labels() {
    const k = st.type === "personal" ? "p" : "b";
    f.querySelectorAll('.qo[data-k="size"]').forEach(b => { b.textContent = b.dataset[k]; });
  }
  function mark(k, v) {
    f.querySelectorAll('.qo[data-k="' + k + '"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v));
  }
  function go(n, focus) {
    step = n;
    sets.forEach((s, i) => { s.hidden = i !== n - 1; });
    dots.forEach((d, i) => { d.className = i === n - 1 ? "on" : i < n - 1 ? "ok" : ""; });
    stepEl.textContent = stepText.replace("{n}", n);
    if (n === 3) chip.textContent = L.chip(pack() || "—");
    if (focus !== false) {
      const t = sets[n - 1].querySelector("button,input");
      if (t) setTimeout(() => t.focus({ preventScroll: true }), 60);
    }
  }

  f.addEventListener("click", e => {
    const o = e.target.closest(".qo");
    if (o) {
      st[o.dataset.k] = o.dataset.v;
      mark(o.dataset.k, o.dataset.v);
      if (o.dataset.k === "type") { labels(); if (st.size) mark("size", st.size); setTimeout(() => go(2), 220); }
      else setTimeout(() => go(3), 220);
      return;
    }
    if (e.target.closest(".qback")) go(Math.max(1, step - 1));
  });

  // "Choose GuildPack X" buttons in the pricing section pre-fill steps 1 and 2
  document.querySelectorAll("[data-plan]").forEach(b => b.addEventListener("click", () => {
    const p = b.dataset.plan;
    st.type = /^Personal/.test(p) ? "personal" : "business";
    st.size = /Beginner|1$/.test(p) ? "small" : /Intermediate|2$/.test(p) ? "medium" : "large";
    mark("type", st.type); labels(); mark("size", st.size);
    go(3, false);
  }));

  f.addEventListener("submit", async e => {
    e.preventDefault();
    const name = f.name.value.trim(), contact = f.contact.value.trim();
    if (!name) return bad(f.name, msg, L.nameBad);
    if (!emailOk(contact) && !phoneOk(contact)) return bad(f.contact, msg, L.contactBad);
    const btn = f.querySelector('button[type="submit"]');
    const data = { name, contact, type: TN[st.type] || "Not sure yet", size: SZ[st.size] || "-", pack: pack() || "-", newsletter: f.newsletter.checked, website: f.website.value, lang: document.documentElement.lang };
    btn.disabled = true; btn.textContent = L.sending; msg.className = "msg";
    try {
      await post(QUOTE_ENDPOINT, data);
      f.querySelector(".qwrap").hidden = true;
      f.querySelector(".qdone").hidden = false;
      f.querySelector(".qdone").focus();
    } catch (err) {
      btn.disabled = false; btn.textContent = L.send;
      const wa = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(L.hi(name, data.type, data.pack, contact));
      msg.className = "msg err"; msg.textContent = L.fail + " ";
      const a = document.createElement("a"); a.href = wa; a.target = "_blank"; a.rel = "noopener"; a.textContent = L.waLink;
      msg.appendChild(a);
    }
  });
})();

/* ---------- Newsletter ---------- */
(function () {
  const n = document.getElementById("newsForm");
  if (!n) return;
  n.addEventListener("submit", async e => {
    e.preventDefault();
    const v = document.getElementById("newsEmail").value.trim(), msg = document.getElementById("newsMsg");
    if (!emailOk(v)) return bad(document.getElementById("newsEmail"), msg, L.newsBad);
    try { await post(NEWSLETTER_ENDPOINT, { email: v, lang: document.documentElement.lang }); n.reset(); show(msg, L.newsOk, true); }
    catch (err) { show(msg, L.newsFail, false); }
  });
})();
