(function () {
  var d = document, h = d.documentElement, id = h.lang === "id";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var y = d.getElementById("yr");
  if (y) y.textContent = new Date().getFullYear();


  // Invoice totals count up when they scroll into view
  (function () {
    var nodes = d.querySelectorAll(".total .now");
    if (!nodes.length || reduce || !("IntersectionObserver" in window)) return;
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        io2.unobserve(en.target);
        run(en.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });
    function fmt(v, pre, sep) { var s = String(v); if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, sep); return pre + s; }
    function run(el) {
      var cnt = el.querySelector(".cnt"), val = +el.dataset.val, pre = el.dataset.pre, sep = el.dataset.sep;
      var t0 = performance.now(), dur = 1700;
      (function f(t) {
        var k = Math.min(1, (t - t0) / dur), e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
        cnt.textContent = fmt(Math.round(val * e), pre, sep);
        if (k < 1) requestAnimationFrame(f); else el.classList.add("done");
      })(t0);
    }
    nodes.forEach(function (el) {
      var txt = el.textContent.trim(), m = txt.match(/^([^\d]*)([\d.,]+)$/);
      if (!m) return;
      var digits = m[2].replace(/\d/g, "");
      el.dataset.pre = m[1]; el.dataset.sep = digits ? digits.charAt(0) : ""; el.dataset.val = m[2].replace(/[.,]/g, "");
      el.innerHTML = '<span class="cnt" aria-hidden="true">' + txt + '</span><span class="vh">' + txt + "</span>";
      io2.observe(el);
    });
  })();

  // Mobile menu
  var mb = d.querySelector(".menu-btn"), nv = d.querySelector("header nav");
  if (mb && nv) {
    mb.addEventListener("click", function () {
      var o = nv.classList.toggle("open");
      mb.setAttribute("aria-expanded", o ? "true" : "false");
    });
    nv.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nv.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); }
    });
  }

  // Scroll progress bar
  var pr = d.querySelector(".prog");
  function sp() {
    if (!pr) return;
    var m = h.scrollHeight - innerHeight;
    pr.style.width = (m > 0 ? (scrollY / m) * 100 : 0) + "%";
  }
  addEventListener("scroll", sp, { passive: true });
  sp();

  // Reveal on scroll
  var els = d.querySelectorAll(".step,.inv,.sec-head,details.faq,.tabs");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(function (e) { e.classList.add("rv"); io.observe(e); });
  }

  // Cookie consent (stored in localStorage; no cookies are set by this site)
  var K = "tg_consent";
  var T = id
    ? { t: "Kami hanya memakai penyimpanan esensial agar situs ini berfungsi. Cookie opsional, seperti analitik, tetap mati kecuali Anda menerimanya.", a: "Terima semua", r: "Hanya esensial", p: "Kebijakan Cookie", l: "/cookies-id", n: "Pemberitahuan cookie" }
    : { t: "We only use essential storage to make this site work. Optional cookies, such as analytics, stay off unless you accept them.", a: "Accept all", r: "Essential only", p: "Cookie Policy", l: "/cookies", n: "Cookie notice" };
  function get() { try { return JSON.parse(localStorage.getItem(K)); } catch (e) { return null; } }
  function save(a) {
    try { localStorage.setItem(K, JSON.stringify({ v: 1, analytics: a, ts: Date.now() })); } catch (e) {}
    window.tgConsent = { essential: true, analytics: a };
    var b = d.getElementById("cc"); if (b) b.remove();
    d.dispatchEvent(new CustomEvent("tg-consent", { detail: window.tgConsent }));
  }
  function banner() {
    if (d.getElementById("cc")) return;
    var b = d.createElement("div");
    b.id = "cc"; b.className = "cc"; b.setAttribute("role", "region"); b.setAttribute("aria-label", T.n);
    b.innerHTML = '<p>' + T.t + ' <a href="' + T.l + '">' + T.p + '</a></p><div><button type="button" class="btn alt" data-a>' + T.a + '</button><button type="button" class="btn ghost" data-r>' + T.r + '</button></div>';
    b.querySelector("[data-a]").addEventListener("click", function () { save(true); });
    b.querySelector("[data-r]").addEventListener("click", function () { save(false); });
    d.body.appendChild(b);
  }
  var c = get();
  window.tgConsent = c ? { essential: true, analytics: !!c.analytics } : { essential: true, analytics: false };
  if (!c) banner();
  d.querySelectorAll("[data-cookie-settings]").forEach(function (b) { b.addEventListener("click", banner); });
})();
