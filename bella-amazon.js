/* Bella Bay — Module Amazon conforme (Associés Amazon Canada)
   - Affiche un bouton « Voir sur Amazon.ca » UNIQUEMENT pour les produits dont
     l'ASIN a été vérifié sur amazon.ca. L'achat, le paiement et la livraison
     se font sur Amazon : ce n'est jamais présenté comme une vente Bella Bay.
   - Attribution affiliée : renseigner BB_AMAZON_TAG avec l'identifiant
     d'Associé de Bella (ex. « bellabay-20 ») dès l'inscription au programme
     d'Associés d'Amazon Canada. Tant qu'il est vide, le lien fonctionne
     mais aucune commission n'est attribuée. */
(function () {
  var BB_AMAZON_TAG = ""; // <-- identifiant Associés Amazon Canada de Bella Bay
  var PRODUITS_AMAZON = [
    { match: "portofino", asin: "B01GXT75Y0", nom: "Sèche-cheveux Portofino BaBylissPRO" }
  ];
  function lienAmazon(asin) {
    return "https://www.amazon.ca/dp/" + asin + (BB_AMAZON_TAG ? "?tag=" + BB_AMAZON_TAG : "");
  }
  function injecter() {
    var boite = document.getElementById("bbProductModalContent");
    if (!boite || boite.querySelector(".bb-amazon-box")) return;
    var html = boite.innerHTML.toLowerCase();
    for (var i = 0; i < PRODUITS_AMAZON.length; i++) {
      var p = PRODUITS_AMAZON[i];
      if (html.indexOf(p.match) === -1) continue;
      var div = document.createElement("div");
      div.className = "bb-amazon-box";
      div.style.cssText = "margin:14px 0;padding:12px;border:1px solid #c9a227;border-radius:12px;background:#fff8fb;text-align:center";
      var texte = "Ce produit est aussi vendu sur <strong>Amazon.ca</strong>.<br>L'achat, le paiement et la livraison se font sur Amazon.";
      if (BB_AMAZON_TAG) {
        texte += "<br><small>Bella Bay participe au programme d'Associés d'Amazon Canada : en passant par ce lien, vous soutenez Bella Bay, sans coût supplémentaire pour vous.</small>";
      }
      div.innerHTML = texte +
        '<div style="margin-top:10px"><a href="' + lienAmazon(p.asin) + '" target="_blank" rel="nofollow sponsored noopener noreferrer" ' +
        'style="display:inline-block;background:#ff9900;color:#111;font-weight:700;padding:10px 18px;border-radius:999px;text-decoration:none">Voir sur Amazon.ca</a></div>';
      boite.appendChild(div);
      return;
    }
  }
  var cible = document.getElementById("bbProductModalContent");
  if (cible) {
    new MutationObserver(injecter).observe(cible, { childList: true, subtree: true });
    document.addEventListener("click", function () { setTimeout(injecter, 300); });
  }
})();
