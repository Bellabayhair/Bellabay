/* ============================================================
   BELLA IA — Suite Expérience (modules réels, catalogue réel)
   Hair Studio · Personal Shopper · Complete My Look ·
   Beauty Memory (avec consentement) · Concierge VIP
   Les recommandations lisent le catalogue du site (bbProducts)
   et utilisent ses vraies fonctions (bbOpenProduct, addToCart).
   Aucune simulation : Virtual Makeover (essayage AR) n'est PAS
   inclus — il exige un fournisseur AR/API dédié (voir rapport).
   ============================================================ */
(function () {
  "use strict";
  function produits() { try { return (typeof bbProducts !== "undefined") ? bbProducts : []; } catch (e) { return []; } }
  function texte(p) { return ((p.title || "") + " " + (p.desc || "") + " " + (p.tag || "") + " " + (p.category || "")).toLowerCase(); }
  function prix(p) { return p.price || (p.priceCAD ? p.priceCAD.toFixed(2).replace(".", ",") + " $ CAD" : ""); }
  function noter(p, mots) { var t = texte(p), s = 0; mots.forEach(function (m) { if (t.indexOf(m) !== -1) s++; }); return s; }
  function carte(p) {
    return '<div style="background:#fff;border:1px solid #f0d9e2;border-radius:14px;overflow:hidden;min-width:180px;max-width:180px;box-shadow:0 6px 16px rgba(13,10,12,.07)">' +
      (p.img ? '<img src="' + p.img + '" alt="" loading="lazy" style="width:100%;height:120px;object-fit:cover">' : "") +
      '<div style="padding:10px"><div style="font-weight:700;font-size:.9em;min-height:2.4em;color:#0d0a0c">' + p.title + '</div>' +
      '<div style="color:#b76e79;font-weight:700;margin:4px 0">' + prix(p) + '</div>' +
      '<div style="display:flex;gap:6px"><button type="button" data-voir="' + p.id + '" style="background:#0d0a0c;color:#f7dce6;border:0;border-radius:999px;padding:7px 12px;cursor:pointer;font-weight:700">Voir</button>' +
      '<button type="button" data-ajout="' + p.id + '" style="background:linear-gradient(90deg,#b76e79,#c9a227);color:#fff;border:0;border-radius:999px;padding:7px 12px;cursor:pointer;font-weight:700">Ajouter</button></div></div></div>';
  }
  function brancherBoutons(racine) {
    racine.querySelectorAll("[data-voir]").forEach(function (b) { b.addEventListener("click", function () { if (typeof bbOpenProduct === "function") bbOpenProduct(b.getAttribute("data-voir")); }); });
    racine.querySelectorAll("[data-ajout]").forEach(function (b) { b.addEventListener("click", function () { if (typeof addToCart === "function") { addToCart(b.getAttribute("data-ajout")); b.textContent = "Ajouté ✓"; } }); });
  }
  function rangCartes(liste) { return '<div style="display:flex;gap:12px;overflow-x:auto;padding:10px 2px">' + liste.map(carte).join("") + "</div>"; }

  /* ---------- Beauty Memory (consentement explicite, local seulement) ---------- */
  var CLE_MEM = "bbBeautyMemoryV1";
  function memoire() { try { return JSON.parse(localStorage.getItem(CLE_MEM) || '{"consent":false}'); } catch (e) { return { consent: false }; } }
  function sauverMemoire(m) { try { localStorage.setItem(CLE_MEM, JSON.stringify(m)); } catch (e) {} }

  /* ---------- Fenêtre commune ---------- */
  function fenetre(titre, contenuHTML) {
    var ancien = document.getElementById("bbSuiteModal"); if (ancien) ancien.remove();
    var fond = document.createElement("div");
    fond.id = "bbSuiteModal";
    fond.style.cssText = "position:fixed;inset:0;background:rgba(13,10,12,.72);z-index:10001;display:flex;align-items:center;justify-content:center;padding:14px";
    fond.innerHTML = '<div style="background:#fdfaf7;max-width:640px;width:100%;max-height:88vh;overflow:auto;border-radius:18px;padding:24px;border:1px solid #c9a227;box-shadow:0 24px 60px rgba(0,0,0,.4)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">' + titre + '</h3>' +
      '<button type="button" id="bbSuiteX" style="background:none;border:0;font-size:22px;cursor:pointer;color:#b76e79">✕</button></div><div id="bbSuiteCorps"></div></div>';
    document.body.appendChild(fond);
    fond.querySelector("#bbSuiteCorps").innerHTML = contenuHTML;
    fond.addEventListener("click", function (e) { if (e.target === fond) fond.remove(); });
    fond.querySelector("#bbSuiteX").addEventListener("click", function () { fond.remove(); });
    brancherBoutons(fond);
    return fond;
  }
  var styleSel = 'style="padding:9px;border:1px solid #e5c8d4;border-radius:10px;width:100%;margin:4px 0 10px;background:#fff"';
  var styleBtn = 'style="background:linear-gradient(90deg,#b76e79,#c9a227);color:#fff;border:0;border-radius:999px;padding:11px 22px;cursor:pointer;font-weight:700;width:100%"';

  /* ---------- Hair Studio ---------- */
  var SOUCIS = {
    "Sécheresse": ["hydrat", "nourr", "huile", "argan", "masque", "conditioner", "repair"],
    "Casse / pointes abîmées": ["repair", "répar", "kératine", "keratin", "protéine", "renfor"],
    "Frisottis": ["liss", "sérum", "serum", "huile", "anti-frisottis", "soie"],
    "Manque de volume": ["volume", "densité", "densite", "mousse", "textur"],
    "Brillance": ["brillance", "shine", "gloss", "huile", "sérum"],
    "Cuir chevelu sensible": ["doux", "apais", "sensible", "aloe", "sans sulfate"]
  };
  function ouvrirHairStudio() {
    var mem = memoire();
    var options = Object.keys(SOUCIS).map(function (s) { return '<option>' + s + "</option>"; }).join("");
    var f = fenetre("💇‍♀️ Bella Hair Studio — votre diagnostic capillaire",
      '<label>Votre souci principal</label><select id="hsSouci" ' + styleSel + ">" + options + "</select>" +
      '<label>Votre type de cheveux</label><select id="hsType" ' + styleSel + ">" +
      ["Lisses", "Ondulés", "Bouclés", "Crépus", "Colorés / méchés", "Extensions / perruque"].map(function (t) { return '<option' + (mem.hairType === t ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select>" +
      '<button type="button" id="hsGo" ' + styleBtn + ">Voir ma routine recommandée</button><div id=\"hsRes\"></div>");
    f.querySelector("#hsGo").addEventListener("click", function () {
      var souci = f.querySelector("#hsSouci").value, type = f.querySelector("#hsType").value;
      var mots = SOUCIS[souci].slice();
      if (type.indexOf("Extension") === 0) mots = mots.concat(["extension", "doux", "sans sulfate"]);
      if (type === "Colorés / méchés") mots = mots.concat(["color", "couleur", "éclat"]);
      if (type === "Bouclés" || type === "Crépus") mots = mots.concat(["boucle", "curl", "hydrat", "nourr"]);
      var cap = produits().filter(function (p) { return noter(p, ["cheveux", "capillaire", "shampooing", "conditioner", "sérum capillaire", "huile", "masque", "extension", "perruque"]) > 0 && noter(p, ["rouge à lèvres", "fond de teint", "mascara", "vernis"]) === 0; });
      cap.sort(function (a, b) { return noter(b, mots) - noter(a, mots); });
      var top = cap.filter(function (p) { return noter(p, mots) > 0; }).slice(0, 3);
      if (!top.length) top = cap.slice(0, 3);
      f.querySelector("#hsRes").innerHTML = '<p style="margin-top:14px">Pour <strong>' + type.toLowerCase() + '</strong> — souci : <strong>' + souci.toLowerCase() + '</strong>. Voici ce que le catalogue Bella Bay a de mieux pour vous :</p>' + rangCartes(top);
      brancherBoutons(f);
      var m = memoire(); if (m.consent) { m.hairType = type; sauverMemoire(m); }
    });
  }

  /* ---------- Personal Shopper ---------- */
  function ouvrirShopper() {
    var f = fenetre("🛍️ Bella Personal Shopper",
      '<label>Pour quelle occasion?</label><select id="psOcc" ' + styleSel + "><option>Me faire plaisir</option><option>Cadeau pour une proche</option><option>Soirée / événement</option><option>Mariage</option><option>Routine quotidienne</option></select>" +
      '<label>Votre budget total</label><select id="psBudget" ' + styleSel + '><option value="50">Moins de 50 $</option><option value="150">50 $ à 150 $</option><option value="400">150 $ à 400 $</option><option value="99999">Sans limite, le meilleur</option></select>' +
      '<button type="button" id="psGo" ' + styleBtn + ">Composer ma sélection</button><div id=\"psRes\"></div>");
    f.querySelector("#psGo").addEventListener("click", function () {
      var budget = parseFloat(f.querySelector("#psBudget").value), occ = f.querySelector("#psOcc").value;
      var tous = produits().filter(function (p) { return p.priceCAD > 0; });
      if (occ.indexOf("Cadeau") === 0) tous.sort(function (a, b) { return (b.gift ? 1 : 0) - (a.gift ? 1 : 0) || b.priceCAD - a.priceCAD; });
      else tous.sort(function (a, b) { return b.priceCAD - a.priceCAD; });
      var panier = [], total = 0, cats = {};
      for (var i = 0; i < tous.length && panier.length < 4; i++) {
        var p = tous[i];
        if (total + p.priceCAD > budget) continue;
        if (cats[p.category] && panier.length > 1) continue;
        panier.push(p); total += p.priceCAD; cats[p.category] = 1;
      }
      f.querySelector("#psRes").innerHTML = '<p style="margin-top:14px">Sélection <strong>' + occ.toLowerCase() + '</strong> — total <strong>' + total.toFixed(2).replace(".", ",") + " $ CAD</strong> (budget respecté) :</p>" + rangCartes(panier) +
        '<p style="font-size:.9em;color:#8a6d1f">Ajoutez chaque produit au panier, ou touchez « Voir » pour le découvrir.</p>';
      brancherBoutons(f);
    });
  }

  /* ---------- Beauty Memory ---------- */
  function ouvrirMemoire() {
    var m = memoire();
    var f = fenetre("🧠 Bella Beauty Memory — vos préférences",
      '<p>Bella peut se souvenir de vos préférences <strong>sur cet appareil seulement</strong>, pour mieux vous conseiller. Rien n\'est envoyé à un serveur.</p>' +
      '<label style="display:flex;gap:8px;align-items:center;margin:10px 0"><input type="checkbox" id="bmConsent" ' + (m.consent ? "checked" : "") + '> Oui, je consens à ce que Bella retienne mes préférences sur cet appareil.</label>' +
      '<label>Votre type de cheveux</label><select id="bmType" ' + styleSel + ">" + ["", "Lisses", "Ondulés", "Bouclés", "Crépus", "Colorés / méchés", "Extensions / perruque"].map(function (t) { return '<option' + (m.hairType === t ? " selected" : "") + ">" + (t || "—") + "</option>"; }).join("") + "</select>" +
      '<button type="button" id="bmSave" ' + styleBtn + ">Enregistrer mes préférences</button>" +
      '<button type="button" id="bmWipe" style="background:none;border:0;color:#b76e79;cursor:pointer;margin-top:10px;text-decoration:underline">Tout effacer de cet appareil</button><div id="bmMsg"></div>');
    f.querySelector("#bmSave").addEventListener("click", function () {
      sauverMemoire({ consent: f.querySelector("#bmConsent").checked, hairType: f.querySelector("#bmType").value });
      f.querySelector("#bmMsg").innerHTML = '<p style="color:#2e7d32;margin-top:10px">✓ Préférences enregistrées sur cet appareil.</p>';
    });
    f.querySelector("#bmWipe").addEventListener("click", function () {
      try { localStorage.removeItem(CLE_MEM); } catch (e) {}
      f.querySelector("#bmMsg").innerHTML = '<p style="color:#b76e79;margin-top:10px">✓ Mémoire effacée de cet appareil.</p>';
    });
  }

  /* ---------- Complete My Look (dans la fiche produit) ---------- */
  var CHAINES = [
    { si: ["shampooing"], alors: ["conditioner", "sérum", "masque"] },
    { si: ["conditioner", "revitalisant"], alors: ["shampooing", "sérum", "huile"] },
    { si: ["extension", "mèche", "meche"], alors: ["shampooing", "sérum", "brosse"] },
    { si: ["sèche-cheveux", "seche-cheveux", "fer à", "fer a"], alors: ["sérum", "protecteur", "thermo"] },
    { si: ["fond de teint"], alors: ["poudre", "éponge", "eponge", "fixateur"] },
    { si: ["rouge à lèvres", "rouge a levres"], alors: ["crayon", "gloss", "baume"] },
    { si: ["vernis"], alors: ["lampe", "base", "top coat"] },
    { si: ["cire"], alors: ["bande", "huile", "apais"] }
  ];
  function completerLook() {
    var boite = document.getElementById("bbProductModalContent");
    if (!boite || boite.querySelector(".bb-look-box")) return;
    var titreVue = (boite.textContent || "").toLowerCase();
    var courant = null;
    produits().forEach(function (p) { if (!courant && titreVue.indexOf((p.title || "").toLowerCase()) !== -1 && p.title.length > 6) courant = p; });
    if (!courant) return;
    var t = texte(courant), mots = [];
    CHAINES.forEach(function (c) { if (c.si.some(function (m) { return t.indexOf(m) !== -1; })) mots = mots.concat(c.alors); });
    if (!mots.length) return;
    var suggestions = produits().filter(function (p) { return p.id !== courant.id && noter(p, mots) > 0; }).slice(0, 3);
    if (!suggestions.length) return;
    var div = document.createElement("div");
    div.className = "bb-look-box";
    div.style.cssText = "margin:14px 0;padding:12px;border:1px solid #c9a227;border-radius:12px;background:#fdf2f5";
    div.innerHTML = "<strong>✨ Complete My Look — va parfaitement avec :</strong>" + rangCartes(suggestions);
    boite.appendChild(div);
    brancherBoutons(div);
  }

  /* ---------- Section hub Bella IA ---------- */
  function tuile(emoji, nom, desc, action) {
    return '<button type="button" data-suite="' + action + '" style="text-align:left;background:#fff;border:1px solid #f0d9e2;border-radius:16px;padding:16px;cursor:pointer;box-shadow:0 6px 16px rgba(13,10,12,.06)">' +
      '<div style="font-size:26px">' + emoji + '</div><div style="font-weight:800;color:#0d0a0c;margin:6px 0">' + nom + '</div>' +
      '<div style="color:#5b4a4f;font-size:.92em">' + desc + "</div></button>";
  }
  function construireHub() {
    if (document.getElementById("bbIaSuite")) return;
    var boutique = document.getElementById("boutique"); if (!boutique) return;
    var sec = document.createElement("section");
    sec.id = "bbIaSuite"; sec.className = "section";
    sec.style.background = "#fdf2f5";
    sec.innerHTML = '<div class="container"><div class="section-title"><small>BELLA IA — MORE THAN AN ASSISTANT</small><h2>L\'Expérience Beauté Bella IA</h2>' +
      "<p>Six spécialistes beauté, branchées sur le vrai catalogue Bella Bay, prêtes à vous conseiller jour et nuit.</p></div>" +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px">' +
      tuile("💇‍♀️", "Bella Hair Studio", "Diagnostic capillaire et routine sur mesure selon votre souci.", "hair") +
      tuile("🛍️", "Bella Personal Shopper", "Une sélection composée selon l'occasion et votre budget.", "shopper") +
      tuile("✨", "Complete My Look", "Dans chaque fiche produit : les compléments qui vont avec.", "look") +
      tuile("🧠", "Bella Beauty Memory", "Vos préférences retenues sur votre appareil, avec votre consentement.", "memory") +
      tuile("🎁", "Bella Gift Designer", "Le créateur de paniers cadeaux Bella Bay.", "gift") +
      tuile("👑", "Bella VIP Concierge", "Rendez-vous et services à domicile, en un toucher.", "vip") +
      "</div></div>";
    var match = document.getElementById("bbBeautyMatch");
    if (match && match.parentNode) match.parentNode.insertBefore(sec, match);
    else boutique.parentNode.insertBefore(sec, boutique.nextSibling);
    sec.querySelectorAll("[data-suite]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-suite");
        if (a === "hair") ouvrirHairStudio();
        else if (a === "shopper") ouvrirShopper();
        else if (a === "memory") ouvrirMemoire();
        else if (a === "look") fenetre("✨ Complete My Look", "<p>Ouvrez n'importe quelle fiche produit : Bella IA y ajoute automatiquement les produits complémentaires du catalogue — un shampooing appelle son revitalisant, une extension appelle son soin, un outil appelle son protecteur.</p>");
        else if (a === "gift") { if (typeof openGiftBuilder === "function") openGiftBuilder(); else fenetre("🎁 Bella Gift Designer", "<p>Le créateur de panier cadeau se trouve dans le menu « 🎁 Panier cadeau » en haut du site.</p>"); }
        else if (a === "vip") fenetre("👑 Bella VIP Concierge", '<p>Services de coiffure à domicile — Montréal, Laval et Rive-Nord.</p><p><a href="https://wa.me/15145822856" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#25d366;color:#fff;font-weight:700;padding:11px 20px;border-radius:999px;text-decoration:none">Réserver sur WhatsApp</a></p><p>Ou posez votre question à Bella IA, en bas de l\'écran — elle répond et vous redirige, jour et nuit.</p>');
      });
    });
  }
  function brancher() {
    construireHub();
    var cible = document.getElementById("bbProductModalContent");
    if (cible) {
      new MutationObserver(function () { setTimeout(completerLook, 250); }).observe(cible, { childList: true, subtree: true });
      document.addEventListener("click", function () { setTimeout(completerLook, 400); });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", brancher);
  else brancher();
})();
