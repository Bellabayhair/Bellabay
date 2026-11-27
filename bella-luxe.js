/* Bella Bay — Couche LUXE : lumière du hero + révélations au défilement.
   Léger, sans bibliothèque externe, désactivé si mouvement réduit. */
(function () {
  var calme = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Halo lumineux du hero qui suit la souris (ordinateur seulement) */
  var hero = document.querySelector(".hero");
  if (hero && !calme && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--bb-lx", ((e.clientX - r.left) / r.width * 100) + "%");
      hero.style.setProperty("--bb-ly", ((e.clientY - r.top) / r.height * 100) + "%");
    });
  }
  /* Révélation élégante des sections et cartes au défilement */
  var cibles = document.querySelectorAll(".section-title, .bb-review-card, .bb-rec-card, .bb-fav-card, .bb-sub-card, .bb-pinky-trend-card, .bb-pinky-box-card");
  if (!("IntersectionObserver" in window) || calme) {
    cibles.forEach(function (el) { el.classList.add("bb-luxe-visible"); });
    return;
  }
  cibles.forEach(function (el) { el.classList.add("bb-luxe-reveal"); });
  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("bb-luxe-visible"); obs.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  cibles.forEach(function (el) { obs.observe(el); });
})();
