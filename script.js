// ---- SETUP ----
// Set these to your own endpoints (e.g. Cloudflare Pages Functions at /api/contact and /api/subscribe,
// or a form service). Left empty, the forms fall back to WhatsApp / email so nothing is lost.
const CONTACT_ENDPOINT = "";
const NEWSLETTER_ENDPOINT = "";
const WHATSAPP = "6283177610112";
const EMAIL = "cs@tguild.tech";
// ---------------

const T = {
  en: {
    name: "Please tell us your name.",
    reach: "Please add an email or a phone number so we can reply.",
    badEmail: "That email doesn’t look right. Please check it.",
    need: "Please tell us what you need or what you’d like to ask.",
    sent: "Thank you! Your message is on its way. We’ll reply soon.",
    fail: "Sorry, that didn’t send. Please message us on WhatsApp instead.",
    wa: "Opening WhatsApp so you can send your message.",
    hi: (n, c) => `Hi [t]guild! I'm ${n}${c ? " from " + c : ""}.`,
    contact: "Contact", nl: "Please add me to the newsletter.",
    plan: p => `Hi! I’m interested in the ${p} package.`,
    newsBad: "Please enter a valid email address.",
    newsOk: "You’re subscribed. Welcome!",
    newsFail: "Sorry, we couldn’t subscribe you. Please try again.",
    subj: "Newsletter subscription",
    body: v => `Please subscribe ${v} to the [t]guild newsletter.`
  },
  id: {
    name: "Mohon isi nama Anda.",
    reach: "Mohon isi email atau nomor telepon agar kami bisa membalas.",
    badEmail: "Format email belum benar. Mohon periksa lagi.",
    need: "Mohon tulis kebutuhan atau pertanyaan Anda.",
    sent: "Terima kasih! Pesan Anda sedang dikirim. Kami akan segera membalas.",
    fail: "Maaf, pesan belum terkirim. Silakan hubungi kami lewat WhatsApp.",
    wa: "Membuka WhatsApp agar Anda bisa mengirim pesan.",
    hi: (n, c) => `Halo [t]guild! Saya ${n}${c ? " dari " + c : ""}.`,
    contact: "Kontak", nl: "Mohon daftarkan saya ke newsletter.",
    plan: p => `Halo! Saya tertarik dengan paket ${p}.`,
    newsBad: "Mohon masukkan alamat email yang valid.",
    newsOk: "Anda sudah berlangganan. Selamat datang!",
    newsFail: "Maaf, kami belum bisa mendaftarkan Anda. Silakan coba lagi.",
    subj: "Berlangganan newsletter",
    body: v => `Mohon daftarkan ${v} ke newsletter [t]guild.`
  }
};
const L = T[document.documentElement.lang === "id" ? "id" : "en"];

document.getElementById("yr").textContent = new Date().getFullYear();
const show = (el, text, ok) => { el.textContent = text; el.className = "msg " + (ok ? "ok" : "err"); };
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

async function send(url, data) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error("failed");
}

document.querySelectorAll("[data-plan]").forEach(b => b.addEventListener("click", () => {
  const m = document.getElementById("message");
  if (!m.value) m.value = L.plan(b.dataset.plan);
}));

document.getElementById("contactForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, msg = document.getElementById("formMsg");
  const d = { name: f.name.value.trim(), company: f.company.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), message: f.message.value.trim(), newsletter: f.newsletter.checked };
  if (!d.name) return show(msg, L.name, false);
  if (!d.email && !d.phone) return show(msg, L.reach, false);
  if (d.email && !emailOk(d.email)) return show(msg, L.badEmail, false);
  if (!d.message) return show(msg, L.need, false);
  if (CONTACT_ENDPOINT) {
    try { await send(CONTACT_ENDPOINT, d); f.reset(); show(msg, L.sent, true); }
    catch { show(msg, L.fail, false); }
  } else {
    const text = `${L.hi(d.name, d.company)}\n\n${d.message}\n\n${L.contact}: ${[d.email, d.phone].filter(Boolean).join(" / ")}${d.newsletter ? "\n" + L.nl : ""}`;
    window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    show(msg, L.wa, true);
  }
});

document.getElementById("newsForm").addEventListener("submit", async e => {
  e.preventDefault();
  const v = document.getElementById("newsEmail").value.trim(), msg = document.getElementById("newsMsg");
  if (!emailOk(v)) return show(msg, L.newsBad, false);
  if (NEWSLETTER_ENDPOINT) {
    try { await send(NEWSLETTER_ENDPOINT, { email: v }); e.target.reset(); show(msg, L.newsOk, true); }
    catch { show(msg, L.newsFail, false); }
  } else {
    window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(L.subj) + "&body=" + encodeURIComponent(L.body(v));
  }
});
