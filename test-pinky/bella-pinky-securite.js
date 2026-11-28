/* ============================================================
   Bella Bay — Pinky · Protection & Sécurité (module additif) — v2
   Visuel officiel validé par Bella le 28 nov. 2026 : le léopard
   Pinky (yeux rose fuchsia, patte sur le coquillage rose, badge
   « Protection & Sécurité Pinky »). Aucune couronne, jamais.
   Déclenchement automatique quand la cliente cherche ou demande
   un sujet protection / sécurité :
     1) recherche catalogue (#bbCatalogSearch / bbSearchFor)
     2) Bella IA (#bbAiMsgs) — carte ajoutée après la réponse
   v2 : correction des accents (les marques combinantes sont
   RETIRÉES, pas remplacées par des espaces — « sécurité » matchait
   mal), bannière résistante aux réécritures de la grille, et
   détection Bella IA par observation des messages (robuste).
   Additif seulement : ne modifie ni le catalogue, ni les prix,
   ni le panier, ni PayPal, ni le SEO.
   ============================================================ */
(function () {
  'use strict';

  var IMG = window.BB_PINKY_SECU_IMG || 'img/pinky-protection-securite.png';
  var TITLE = 'Pinky – Protection & Sécurité';
  var LINE = 'Pinky veille sur vous : paiements protégés, achats en toute confiance et conseils de sécurité.';

  /* Mots déclencheurs (FR + EN), comparés sans accents ni casse. */
  var WORDS = [
    'protection', 'securite', 'security', 'safety', 'prevention',
    'proteger', 'protect', 'fraude', 'arnaque', 'scam',
    'confidentialite', 'privacy', 'donnees personnelles',
    'paiement securise', 'secure payment', 'securiser', 'vol d identite'
  ];

  function norm(s) {
    return (' ' + (s || '') + ' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
  function matches(s) {
    var t = norm(s);
    for (var i = 0; i < WORDS.length; i++) {
      if (t.indexOf(WORDS[i]) >= 0) return true;
    }
    return false;
  }

  /* ---------- Styles (injectés une seule fois) ---------- */
  function ensureStyles() {
    if (document.getElementById('bbPinkySecuStyles')) return;
    var st = document.createElement('style');
    st.id = 'bbPinkySecuStyles';
    st.textContent =
      '.bb-pinky-secu-card{margin:0 auto 14px;max-width:520px;background:#0d0d0d;' +
      'border:2px solid #d4af37;border-radius:16px;overflow:hidden;' +
      'box-shadow:0 6px 24px rgba(212,175,55,.25);text-align:center}' +
      '.bb-pinky-secu-card img{display:block;width:100%;height:auto}' +
      '.bb-pinky-secu-txt{padding:10px 14px 12px;color:#f7e7ef;' +
      'font-family:inherit;line-height:1.45}' +
      '.bb-pinky-secu-txt strong{display:block;color:#ffd76a;font-size:1.02em;' +
      'letter-spacing:.02em;margin-bottom:3px}' +
      '.bb-pinky-secu-txt span{font-size:.92em;opacity:.92}' +
      '.bb-ai-msg .bb-pinky-secu-card{margin:6px 0 2px;max-width:340px}' +
      '@media (max-width:600px){.bb-pinky-secu-card{max-width:100%}}';
    document.head.appendChild(st);
  }

  function cardHtml() {
    return '<div class="bb-pinky-secu-card" role="note" aria-label="' + TITLE + '">' +
      '<img src="' + IMG + '" alt="Pinky – Protection &amp; Sécurité Bella Bay" loading="lazy">' +
      '<div class="bb-pinky-secu-txt"><strong>' + TITLE + '</strong>' +
      '<span>' + LINE + '</span></div></div>';
  }

  /* ---------- 1) Recherche catalogue ---------- */
  var banner = null;
  function showSearchBanner(show) {
    var grid = document.getElementById('bbCatalogGrid');
    if (!grid || !grid.parentNode) return;
    if (show) {
      ensureStyles();
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'bbPinkySecuBanner';
        banner.innerHTML = cardHtml();
      }
      if (banner.parentNode !== grid.parentNode || banner.nextSibling !== grid) {
        grid.parentNode.insertBefore(banner, grid);
      }
    } else if (banner && banner.parentNode) {
      banner.parentNode.removeChild(banner);
    }
  }
  function evalSearch(term) {
    var input = document.getElementById('bbCatalogSearch');
    var q = (typeof term === 'string' && term) || (input ? input.value : '');
    showSearchBanner(matches(q));
  }

  function hookSearch() {
    var input = document.getElementById('bbCatalogSearch');
    if (input) {
      input.addEventListener('input', function () { evalSearch(); });
      input.addEventListener('change', function () { evalSearch(); });
    }
    var btn = document.getElementById('bbCatalogSearchButton');
    if (btn) btn.addEventListener('click', function () { setTimeout(evalSearch, 80); });
    ['bbSearchFor', 'bbMenuSearch'].forEach(function (name) {
      var orig = window[name];
      if (typeof orig === 'function' && !orig.__pinkySecuWrapped) {
        var wrapped = function () {
          var r = orig.apply(this, arguments);
          var term = arguments && arguments.length ? arguments[0] : undefined;
          setTimeout(function () { evalSearch(term); }, 80);
          return r;
        };
        wrapped.__pinkySecuWrapped = true;
        window[name] = wrapped;
      }
    });
    /* Si le site réécrit la grille ou son conteneur, on réévalue :
       la bannière est réinsérée si un rendu l'a emportée. */
    var grid = document.getElementById('bbCatalogGrid');
    if (grid && window.MutationObserver) {
      var reeval = function () { evalSearch(); };
      new MutationObserver(reeval).observe(grid, { childList: true });
      if (grid.parentNode) {
        new MutationObserver(reeval).observe(grid.parentNode, { childList: true });
      }
    }
  }

  /* ---------- 2) Bella IA : observation des messages ---------- */
  var pendingCard = false;
  var cardGivenFor = null;
  function addChatCard() {
    ensureStyles();
    if (typeof window.bbAiAddMsg === 'function') {
      window.bbAiAddMsg('ai', cardHtml());
    } else {
      var box = document.getElementById('bbAiMsgs');
      if (!box) return;
      var d = document.createElement('div');
      d.className = 'bb-ai-msg ai';
      d.innerHTML = cardHtml();
      box.appendChild(d);
      box.scrollTop = box.scrollHeight;
    }
  }
  function hookAi() {
    var box = document.getElementById('bbAiMsgs');
    if (!box || !window.MutationObserver) return;
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (!node || node.nodeType !== 1) continue;
          if (node.classList.contains('me')) {
            pendingCard = matches(node.textContent || '');
            cardGivenFor = null;
          } else if (node.classList.contains('ai')) {
            if (node.querySelector && node.querySelector('.bb-pinky-secu-card')) {
              continue; /* c'est notre propre carte */
            }
            var txt = (node.textContent || '').replace(/\s+/g, '');
            if (txt === '' || txt === '…' || txt === '...') {
              continue; /* bulle « en train d'écrire » de Bella IA : attendre la vraie réponse */
            }
            if (pendingCard && cardGivenFor === null) {
              cardGivenFor = node;
              pendingCard = false;
              setTimeout(addChatCard, 350);
            }
          }
        }
      }
    }).observe(box, { childList: true });
  }

  function init() {
    hookSearch();
    hookAi();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
