(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;


  /* ── Idiomas (inglês padrão, português pelo botão do topo) ────────────── */
  const T = window.TEXTOS || {};
  const aplicarIdioma = (l) => {
    const t = T[l]; if (!t) return;
    document.documentElement.lang = (window.IDIOMAS || {})[l] || l; window.IDIOMA_ATUAL = l;
    const tk = document.body.dataset.titulo || "titulo_pagina"; if (t[tk]) document.title = t[tk];
    document.querySelectorAll("[data-i18n]").forEach((el) => { const v = t[el.dataset.i18n]; if (v != null) el.innerHTML = v; });
    document.querySelectorAll("[data-i18n-href]").forEach((el) => { const v = t[el.dataset.i18nHref]; if (v) el.href = v; });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => { const v = t[el.dataset.i18nAria]; if (v != null) el.setAttribute("aria-label", v); });
    document.querySelectorAll("[data-idioma]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.idioma === l)));
    try { localStorage.setItem("idioma", l); } catch (e) {}
  };
  const PADRAO = window.IDIOMA_PADRAO || "pt";
  let idioma = PADRAO;
  try { idioma = localStorage.getItem("idioma") || PADRAO; } catch (e) {}
  const pedido = new URLSearchParams(location.search).get("lang");
  if (pedido) idioma = pedido;
  aplicarIdioma(T[idioma] ? idioma : PADRAO);
  document.querySelectorAll("[data-idioma]").forEach((b) => b.addEventListener("click", () => aplicarIdioma(b.dataset.idioma)));
  setTimeout(() => { document.body.classList.remove("carregando"); document.body.classList.add("pronto"); }, 2500); // nunca prende a pessoa

  // Sem vídeo de abertura na rolagem, a tela de carregamento sai assim que a página carrega
  if (!(S.frames && S.frames.total)) {
    const abrir = () => { document.body.classList.remove("carregando"); document.body.classList.add("pronto"); };
    if (document.readyState === "complete") setTimeout(abrir, 500); else addEventListener("load", () => setTimeout(abrir, 500));
  }

  /* ── Rolagem que toca o vídeo ─────────────────────────────────────────── */
  const cine = document.querySelector(".cine");
  const canvas = cine && cine.querySelector(".cine-canvas");
  if (cine && canvas && S.frames && S.frames.total) {
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const padrao = celular ? S.frames.mobile : S.frames.desktop;
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const quadros = new Array(total);
    const momentos = [...cine.querySelectorAll(".momento")];
    let alvo = 0, atual = 0, desenhado = -1;

    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };

    // Carrega em passadas (1 a cada 8, depois 1 a cada 4…) para cobrir o filme inteiro cedo
    carregar(0);
    if (!reduzir) {
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0;
      const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
      lote();
    }

    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) {
        if (pronto(i - d)) return i - d;
        if (pronto(i + d)) return i + d;
      }
      return -1;
    };

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhado = -1;
      desenhar(Math.round(atual), true);
    };

    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j];
      const cw = canvas.width, ch = canvas.height;
      const escala = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // "cover"
      const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
      let fx = 0.5;
      const foco = celular && S.frames.focoCelular;
      if (foco) {
        const p = j / (total - 1);
        for (let k = 1; k < foco.length; k++) if (p <= foco[k][0]) {
          const [p0, f0] = foco[k - 1], [p1, f1] = foco[k];
          fx = f0 + (f1 - f0) * ((p - p0) / (p1 - p0 || 1)); break;
        }
      }
      const x = Math.min(0, Math.max(cw - w, cw / 2 - fx * w));
      ctx.drawImage(img, x, (ch - h) / 2, w, h);
      if (!document.body.classList.contains("pronto")) { document.body.classList.remove("carregando"); document.body.classList.add("pronto"); }
      desenhado = j;
    }

    const progresso = () => {
      const r = cine.getBoundingClientRect();
      const curso = cine.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -r.top / (curso || 1)));
    };

    const atualizarMomentos = (p) => {
      for (const m of momentos) {
        const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
        m.classList.toggle("ativo", p >= de && (p < ate || (ate >= 1 && p >= 1)));
      }
      cine.classList.toggle("andou", p > 0.02);
    };

    let cineNaTela = true;
    new IntersectionObserver(([e]) => { cineNaTela = e.isIntersecting; }, { rootMargin: "200px" }).observe(cine);
    const quadro = () => {
      if (!cineNaTela) return requestAnimationFrame(quadro);   // fora da tela, não gasta o aparelho
      let pr = progresso();
      const ritmo = S.frames.ritmo; // [rolagem, vídeo]: segura o filme nos trechos que merecem mais tempo
      if (ritmo) for (let k = 1; k < ritmo.length; k++) if (pr <= ritmo[k][0]) {
        const [r0, v0] = ritmo[k - 1], [r1, v1] = ritmo[k];
        pr = v0 + (v1 - v0) * ((pr - r0) / (r1 - r0 || 1)); break;
      }
      alvo = pr * (total - 1);
      atual += (alvo - atual) * (celular ? 0.14 : 0.1); // suaviza: sensação de filme, não de slide
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      atualizarMomentos(atual / (total - 1));
      requestAnimationFrame(quadro);
    };

    addEventListener("resize", ajustar);
    ajustar();
    if (reduzir) atualizarMomentos(0);
    else requestAnimationFrame(quadro);
  }

  /* ── Parallax leve nas artes ──────────────────────────────────────────── */
  const artes = reduzir ? [] : [...document.querySelectorAll(".arte")];
  if (artes.length) {
    const mover = () => {
      for (const a of artes) {
        const r = a.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        a.style.transform = `translate3d(0, ${(c * -60).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    addEventListener("scroll", () => requestAnimationFrame(mover), { passive: true });
    mover();
  }

  /* ── Topo, revelar e ano ──────────────────────────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let formNaTela = false; // o botão flutuante se recolhe para não cobrir o "Enviar"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    whats && whats.classList.toggle("visivel", scrollY > innerHeight * 0.6 && !formNaTela);
  };
  const formEl = document.querySelector(".form");
  if (formEl) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── E-mail de contato (vem do config.js) ── */
  if (S.contato && S.contato.email) document.querySelectorAll("[data-contato]").forEach((a) => { a.href = "mailto:" + S.contato.email; a.textContent = S.contato.email; });

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (whats && S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    const zap = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
    whats.href = zap;
    document.querySelectorAll("[data-whats]").forEach((a) => (a.href = zap));
    const visivel = num.length >= 12 ? `+${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, -4)}-${num.slice(-4)}` : num;
    document.querySelectorAll("[data-zap-n]").forEach((e) => (e.textContent = visivel));
  }

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const tx = (k) => ((window.TEXTOS || {})[window.IDIOMA_ATUAL] || {})[k] || "";
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar(tx("f_erro"), "falha");

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Novo contato pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar(tx("f_enviando"));
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        avisar(tx("f_ok"), "ok");
        location.href = "obrigado.html";
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar(tx("f_falha"), "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }
})();
