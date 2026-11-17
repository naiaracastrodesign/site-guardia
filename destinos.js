/* Carrossel dos destinos: infinito e fluido.
   Não usa rolagem do navegador: cada cartão é posicionado pela distância até o centro (--sd),
   e a posição desliza com suavização a cada quadro. O cartão do centro toca; os outros pausam.
   Anda por arrasto (mouse ou dedo), setas, clique no cartão, teclado e rolagem lateral do trackpad. */
(() => {
  const car = document.querySelector(".carrossel");
  if (!car) return;
  const trilho = car.querySelector(".trilho");
  const cartoes = [...trilho.querySelectorAll(".destino")];
  const n = cartoes.length;
  const num = car.querySelector(".contador b");
  const tot = car.querySelector(".contador i");
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dois = (v) => String(v).padStart(2, "0");
  if (tot) tot.textContent = dois(n);
  trilho.classList.add("livre");

  let pos = 0, alvo = 0, ativo = -1, naTela = false, passo = 300, rodando = false;
  let arrasto = null, arrastou = false;

  const volta = (v) => ((v % n) + n) % n;                       // índice dentro de 0..n-1
  const perto = (v) => { v = volta(v); return v > n / 2 ? v - n : v; }; // distância mais curta, com sinal

  const medirPasso = () => {
    const w = cartoes[0].offsetWidth;
    passo = w * (innerWidth <= 760 ? 0.98 : 0.9) + (innerWidth <= 760 ? 6 : 22);
    trilho.style.setProperty("--passo", passo.toFixed(1) + "px");
  };

  const tocar = () => cartoes.forEach((c, i) => {
    const v = c.querySelector("video");
    if (i === ativo && naTela && !reduzir) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    else v.pause();
  });

  const desenhar = () => {
    cartoes.forEach((c, i) => {
      const sd = perto(i - pos), d = Math.abs(sd);
      c.style.setProperty("--sd", sd.toFixed(4));
      c.style.setProperty("--d", d.toFixed(4));
      c.style.zIndex = String(10 - Math.round(d * 2));
      c.style.pointerEvents = d > 2.6 ? "none" : "";
    });
    const a = volta(Math.round(pos));
    if (a !== ativo) {
      ativo = a;
      cartoes.forEach((c, i) => c.classList.toggle("ativo", i === ativo));
      if (num) num.textContent = dois(ativo + 1);
      tocar();
    }
  };

  const quadro = () => {
    const falta = alvo - pos;
    if (Math.abs(falta) < 0.0008) { pos = alvo; desenhar(); rodando = false; return; }
    pos += falta * (arrasto ? 0.45 : 0.085);                    // segue a mão de perto; solto, desliza macio
    desenhar();
    requestAnimationFrame(quadro);
  };
  const andar = () => { if (reduzir) { pos = alvo; desenhar(); return; } if (!rodando) { rodando = true; requestAnimationFrame(quadro); } };
  const ir = (v) => { alvo = v; andar(); };

  car.querySelectorAll(".seta").forEach((b) => b.addEventListener("click", () => ir(Math.round(alvo) + Number(b.dataset.passo))));
  trilho.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); ir(Math.round(alvo) + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(Math.round(alvo) - 1); }
  });

  /* Arrasto com mouse ou dedo */
  trilho.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    arrasto = { x: e.clientX, y: e.clientY, inicio: alvo, ultimoX: e.clientX, ultimoT: performance.now(), vel: 0, travado: false };
    arrastou = false;
  });
  addEventListener("pointermove", (e) => {
    if (!arrasto) return;
    const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
    if (!arrasto.travado) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { arrasto = null; return; }   // gesto vertical: deixa a página rolar
      arrasto.travado = true; arrastou = true; trilho.classList.add("arrastando");
    }
    const t = performance.now(), dt = Math.max(1, t - arrasto.ultimoT);
    arrasto.vel = arrasto.vel * 0.6 + ((e.clientX - arrasto.ultimoX) / dt) * 0.4;   // px por ms, suavizado
    arrasto.ultimoX = e.clientX; arrasto.ultimoT = t;
    ir(arrasto.inicio - dx / passo);
  }, { passive: true });
  const soltar = () => {
    if (!arrasto) return;
    const a = arrasto; arrasto = null;
    trilho.classList.remove("arrastando");
    if (!a.travado) return;
    const impulso = Math.max(-1.2, Math.min(1.2, (-a.vel * 220) / passo));  // um empurrão leva um cartão adiante
    ir(Math.round(alvo + impulso));
  };
  addEventListener("pointerup", soltar);
  addEventListener("pointercancel", soltar);
  trilho.addEventListener("dragstart", (e) => e.preventDefault());
  cartoes.forEach((c, i) => c.addEventListener("click", () => {
    if (arrastou) { arrastou = false; return; }
    const salto = perto(i - Math.round(alvo));
    if (salto) ir(Math.round(alvo) + salto);
  }));

  /* Rolagem lateral do trackpad */
  let assenta = 0;
  trilho.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    ir(alvo + e.deltaX / passo);
    clearTimeout(assenta); assenta = setTimeout(() => ir(Math.round(alvo)), 120);
  }, { passive: false });

  new IntersectionObserver(([e]) => { naTela = e.isIntersecting; tocar(); }, { threshold: 0.35 }).observe(trilho);
  addEventListener("resize", () => { medirPasso(); desenhar(); });

  medirPasso();
  desenhar();
})();
