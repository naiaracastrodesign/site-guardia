/* Pequenas interações dos blocos */
(() => {
  // Cartões de embarque: viram sozinhos conforme a rolagem. Um toque ou clique vira o cartão de volta (e de novo).
  const bilhetes = [...document.querySelectorAll(".bilhete-giro")];
  if (bilhetes.length) {
    const parado = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pedido = 0;
    const comMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;   // no computador o cartão vira no mouse, como antes
    const girar = () => {
      pedido = 0;
      if (comMouse) return;
      const vh = innerHeight, emLinha = bilhetes.length > 1 && Math.abs(bilhetes[0].getBoundingClientRect().top - bilhetes[1].getBoundingClientRect().top) < 8;
      bilhetes.forEach((el, k) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        // 0 = de frente, 1 = virado. Começa a virar quando o meio do cartão passa de 62% da tela e termina em 38%.
        const meio = (r.top + r.height / 2) / vh;
        const atraso = emLinha ? k * 0.07 : 0;                       // lado a lado, viram um depois do outro
        const p = Math.max(0, Math.min(1, (0.62 - atraso - meio) / 0.24));
        const suave = p * p * (3 - 2 * p);
        el.style.setProperty("--giro", (parado ? (p > 0.5 ? 180 : 0) : suave * 180).toFixed(1) + "deg");
      });
    };
    const pedir = () => { if (!pedido) pedido = requestAnimationFrame(girar); };
    addEventListener("scroll", pedir, { passive: true });
    addEventListener("resize", pedir);
    girar();
    bilhetes.forEach((el) => el.addEventListener("click", () => {
      const virado = el.getAttribute("aria-pressed") === "true";
      el.setAttribute("aria-pressed", String(!virado));
    }));
  }

  // Vídeos da prova: toca com som no clique; só um por vez
  const reels = [...document.querySelectorAll(".reel")];
  reels.forEach((r) => {
    const v = r.querySelector("video"), b = r.querySelector(".reel-play");
    b.addEventListener("click", () => {
      reels.forEach((o) => { if (o !== r) o.querySelector("video").pause(); });
      v.controls = true;
      const p = v.play(); if (p && p.catch) p.catch(() => {});
    });
    v.addEventListener("play", () => r.classList.add("tocando"));
    v.addEventListener("pause", () => r.classList.remove("tocando"));
    v.addEventListener("ended", () => { r.classList.remove("tocando"); v.controls = false; v.load(); });
  });

  // Rota de voo: o fio dourado se desenha quando o bloco entra na tela
  const rota = document.querySelector(".agencias");
  if (rota) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { rota.classList.add("voando"); o.disconnect(); } }, { threshold: 0.3 }).observe(rota);
  // Agências: no computador, um vaga-lume segue o mouse e deixa um risco que se apaga
  const ag = document.querySelector(".agencias");
  if (ag && matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const cv = document.createElement("canvas");
    cv.className = "rastro"; cv.setAttribute("aria-hidden", "true");
    ag.insertBefore(cv, ag.querySelector(".agencias-texto"));
    const ctx = cv.getContext("2d");
    const aviao = new Path2D("M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z");
    const VIDA = 1100, COMPRIMENTO = 170; // o risco dura pouco e nunca passa de 170px                       // quanto tempo (ms) cada pedaço do risco fica visível
    let pts = [], alvo = null, pos = null, ang = -0.4, dentro = false, rodando = false, dpr = 1;
    const ajustar = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(ag.clientWidth * dpr); cv.height = Math.round(ag.clientHeight * dpr);
    };
    const quadro = () => {
      const agora = performance.now();
      if (alvo && pos) {
        const dx = alvo.x - pos.x, dy = alvo.y - pos.y;
        pos.x += dx * 0.075; pos.y += dy * 0.075;                 // o avião chega macio, um pouco atrás do mouse
        if (Math.hypot(dx, dy) > 0.6) {
          let d = Math.atan2(dy, dx) - ang;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          ang += d * 0.07;
          const u = pts[pts.length - 1];
          if (!u || Math.hypot(pos.x - u.x, pos.y - u.y) > 9) pts.push({ x: pos.x, y: pos.y, t: agora });
        }
      }
      pts = pts.filter((q) => agora - q.t < VIDA);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.lineCap = "butt"; ctx.lineJoin = "round";
      // Curva suave: cada trecho vai do meio de um par de pontos ao meio do par seguinte,
      // usando o ponto entre eles como "puxador". Assim não sobra quina. O trecho mais velho fica mais fino e apagado.
      const todos = pos && dentro ? pts.concat([{ x: pos.x, y: pos.y, t: agora }]) : pts;
      // Distância de cada ponto até o avião, medida ao longo do risco. Passou de COMPRIMENTO, o ponto é descartado.
      const dist = new Array(todos.length).fill(0);
      for (let i = todos.length - 2; i >= 0; i--) dist[i] = dist[i + 1] + Math.hypot(todos[i + 1].x - todos[i].x, todos[i + 1].y - todos[i].y);
      const corte = dist.findIndex((d) => d <= COMPRIMENTO);
      if (corte > 0) pts.splice(0, Math.min(corte, pts.length));
      for (let i = Math.max(1, corte); i < todos.length - 1; i++) {
        const p0 = todos[i - 1], p1 = todos[i], p2 = todos[i + 1];
        const idade = Math.max(0, 1 - (agora - p1.t) / VIDA);
        const lugar = Math.max(0, 1 - dist[i] / COMPRIMENTO);      // 1 junto do avião, 0 na ponta: o fio some no final
        const s = Math.min(idade, lugar), f = s * s * (3 - 2 * s);
        if (f < 0.01) continue;
        ctx.strokeStyle = `rgba(194,155,82,${(f * 0.85).toFixed(3)})`;
        ctx.lineWidth = 0.25 + f * 1.15;
        ctx.beginPath();
        ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        ctx.stroke();
      }
      if (pos && dentro) {
        // Vaga-lume: um ponto de luz que pulsa de leve
        const pulso = 0.75 + 0.25 * Math.sin(agora / 260);
        const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 22);
        g.addColorStop(0, `rgba(243,236,218,${(0.95 * pulso).toFixed(3)})`);
        g.addColorStop(0.18, `rgba(217,181,107,${(0.75 * pulso).toFixed(3)})`);
        g.addColorStop(1, "rgba(194,155,82,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2); ctx.fill();
      }
      if (pts.length || dentro || (dentro && alvo && pos && Math.hypot(alvo.x - pos.x, alvo.y - pos.y) > 0.5)) requestAnimationFrame(quadro);
      else { rodando = false; if (!dentro) ctx.clearRect(0, 0, cv.width, cv.height); }
    };
    const andar = () => { if (!rodando) { rodando = true; requestAnimationFrame(quadro); } };
    ag.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = ag.getBoundingClientRect();
      alvo = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!pos) pos = { x: alvo.x, y: alvo.y };
      if (!dentro) { dentro = true; ag.classList.add("com-mouse"); }
      andar();
    });
    ag.addEventListener("pointerleave", () => { dentro = false; andar(); });
    addEventListener("resize", ajustar);
    ajustar();
  }
  // Aviso de cookies: aparece uma vez; a escolha fica guardada no aparelho
  const ck = document.querySelector(".cookies");
  if (ck) {
    let visto = false; try { visto = localStorage.getItem("cookiesOk") === "1"; } catch (e) {}
    if (!visto) setTimeout(() => { ck.hidden = false; requestAnimationFrame(() => ck.classList.add("visivel")); }, 2500);
    ck.querySelector(".cookies-ok").addEventListener("click", () => {
      try { localStorage.setItem("cookiesOk", "1"); } catch (e) {}
      ck.classList.remove("visivel"); setTimeout(() => (ck.hidden = true), 600);
    });
  }
})();
