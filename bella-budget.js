/* ============================================================================
   BELLA IA — OPTION BUDGET (ajout demandé par Bella, 27 nov. 2026)
   ----------------------------------------------------------------------------
   Module ADDITIF : ne modifie ni ne remplace aucune fonction existante.
   Il enveloppe bbAiAnswer (même technique que les blocs v2/v3 du site) :
   - si le message de la cliente exprime un budget (ex. « budget de 30 $ »,
     « j'ai 20 dollars », « 50 $ »), Bella IA répond avec les articles RÉELS
     du catalogue bbProducts qui respectent ce budget, du MOINS CHER au plus
     cher (présentation validée par Bella : on commence avec l'article le
     moins cher, puis les prix moyens, puis les prix élevés, 100 $ et plus) ;
   - sinon, la réponse d'origine est appelée sans aucun changement.
   Un bouton « 💰 Mon budget » est ajouté à la rangée de suggestions du
   clavardage ; il ouvre le menu des paliers : 10 $, 20 $, 25 $, 50 $,
   100 $ et plus. Tous les prix viennent du catalogue en ligne au moment de
   la réponse : rien n'est inventé, et un palier vide est dit honnêtement
   (avec les articles les plus proches du budget, clairement présentés
   comme tels). 100 % navigateur, 0 $, aucune donnée envoyée.
   ========================================================================== */
(function () {
    'use strict';

    var PALIERS = [10, 20, 25, 50]; /* le palier « 100 $ et plus » est à part */
    var NB_CARTES = 8;

    function lang() { return (typeof bbLang === 'string' && bbLang === 'en') ? 'en' : 'fr'; }
    function esc(s) {
        if (typeof bbEscapeHtml === 'function') return bbEscapeHtml(s);
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function money(n) {
        if (typeof bbMoney === 'function') return bbMoney(n);
        return Number(n).toFixed(2).replace('.', ',') + ' $';
    }
    function produits() {
        try { return (typeof bbProducts !== 'undefined' && bbProducts.length) ? bbProducts : []; }
        catch (e) { return []; }
    }
    function prix(p) { return (typeof p.priceCAD === 'number') ? p.priceCAD : null; }

    var TXT = {
        fr: {
            chip: '💰 Mon budget',
            intro1: 'Avec plaisir 💰 Voici nos prix, du plus petit au plus grand : nos articles commencent à ',
            intro2: ' (baume à lèvres, pinces, petits soins…), beaucoup de choix dans les prix moyens entre 20 $ et 50 $, et nos pièces haut de gamme — perruques et extensions — à 100 $ et plus.',
            intro3: 'Dis-moi ton budget, je te sors ce qui rentre dedans :',
            etPlus: '100 $ et plus',
            pourBudget: 'Pour un budget de ',
            articlesOuMoins: ' article(s) à ce prix ou moins au catalogue — du moins cher au plus cher :',
            etAutres: '…et ',
            autres: ' autres. Précise une catégorie (cheveux, maquillage, cils, ongles…) ou tape un autre budget pour affiner.',
            piecesPlus: 'Nos pièces à 100 $ et plus — ',
            piecesPlus2: ' article(s) au catalogue, de la moins chère à la plus élevée :',
            aucun: 'Pour le moment, aucun article à ',
            aucun2: ' ou moins au catalogue — nos plus petits prix commencent à ',
            aucun3: '. Voici les articles les plus proches de ton budget :',
            tapeAutre: 'Tape un autre budget (ex. 25 $) ou choisis un palier ci-dessus quand tu veux.'
        },
        en: {
            chip: '💰 My budget',
            intro1: 'With pleasure 💰 Here are our prices, from lowest to highest: our items start at ',
            intro2: ' (lip balm, tweezers, little treats…), lots of choice in the mid range between $20 and $50, and our premium pieces — wigs and extensions — at $100 and more.',
            intro3: 'Tell me your budget and I will pull out what fits:',
            etPlus: '$100 and more',
            pourBudget: 'For a budget of ',
            articlesOuMoins: ' item(s) at this price or less in the catalogue — from cheapest to most expensive:',
            etAutres: '…and ',
            autres: ' more. Name a category (hair, makeup, lashes, nails…) or type another budget to narrow it down.',
            piecesPlus: 'Our pieces at $100 and more — ',
            piecesPlus2: ' item(s) in the catalogue, from the least expensive to the highest:',
            aucun: 'Right now, no item at ',
            aucun2: ' or less in the catalogue — our lowest prices start at ',
            aucun3: '. Here are the items closest to your budget:',
            tapeAutre: 'Type another budget (e.g. $25) or pick a tier above whenever you like.'
        }
    };
    function t(k) { var L = TXT[lang()] || TXT.fr; return L[k] || TXT.fr[k] || k; }

    function cartesHtml(liste) {
        if (typeof bbAiCardHtml === 'function') return liste.map(function (p) { return bbAiCardHtml(p); }).join('');
        return liste.map(function (p) {
            return '<div class="bb-ai-card"><div style="flex:1;min-width:0;"><b>' + esc(p.title || '') + '</b><span>' + money(prix(p)) + '</span></div></div>';
        }).join('');
    }

    /* Affiche les articles pour un plafond donné (tri croissant, le moins cher d'abord). */
    function afficherPlafond(plafond) {
        var tous = produits().filter(function (p) { return prix(p) != null; });
        if (!tous.length || typeof bbAiAddMsg !== 'function') return;
        var tries = tous.slice().sort(function (a, b) { return prix(a) - prix(b); });
        var dedans = tries.filter(function (p) { return prix(p) <= plafond; });
        if (!dedans.length) {
            var proches = tries.slice(0, 4);
            bbAiAddMsg('ai', esc(t('aucun')) + '<b>' + money(plafond) + '</b>' + esc(t('aucun2')) + '<b>' + money(prix(tries[0])) + '</b>' + esc(t('aucun3')) + cartesHtml(proches));
            return;
        }
        var html = esc(t('pourBudget')) + '<b>' + money(plafond) + '</b> — <b>' + dedans.length + '</b>' + esc(t('articlesOuMoins')) + cartesHtml(dedans.slice(0, NB_CARTES));
        if (dedans.length > NB_CARTES) html += '<br>' + esc(t('etAutres')) + '<b>' + (dedans.length - NB_CARTES) + '</b>' + esc(t('autres'));
        bbAiAddMsg('ai', html);
    }

    /* Affiche les pièces à 100 $ et plus (tri croissant). */
    function afficherPremium() {
        var tous = produits().filter(function (p) { return prix(p) != null && prix(p) >= 100; });
        if (!tous.length || typeof bbAiAddMsg !== 'function') return;
        var tries = tous.slice().sort(function (a, b) { return prix(a) - prix(b); });
        var html = esc(t('piecesPlus')) + '<b>' + tries.length + '</b>' + esc(t('piecesPlus2')) + cartesHtml(tries.slice(0, NB_CARTES));
        if (tries.length > NB_CARTES) html += '<br>' + esc(t('etAutres')) + '<b>' + (tries.length - NB_CARTES) + '</b>' + esc(t('autres'));
        bbAiAddMsg('ai', html);
    }

    /* Fonctions globales appelées par les boutons des messages (style du site). */
    window.bbBudgetTier = function (n) {
        if (n === 100) { afficherPremium(); return; }
        afficherPlafond(n);
    };
    window.bbBudgetOpen = function () {
        var tous = produits().filter(function (p) { return prix(p) != null; });
        if (!tous.length || typeof bbAiAddMsg !== 'function') return;
        var min = Math.min.apply(null, tous.map(prix));
        var btns = PALIERS.map(function (n) {
            return '<button type="button" onclick="bbBudgetTier(' + n + ')" style="margin:4px 4px 0 0;padding:7px 13px;border-radius:999px;border:1px solid #b76e79;background:#fff;color:#8a2a5c;font-weight:700;cursor:pointer;">' + money(n) + '</button>';
        }).join('');
        btns += '<button type="button" onclick="bbBudgetTier(100)" style="margin:4px 4px 0 0;padding:7px 13px;border-radius:999px;border:1px solid #b76e79;background:#8a2a5c;color:#fff;font-weight:700;cursor:pointer;">' + esc(t('etPlus')) + '</button>';
        bbAiAddMsg('ai', esc(t('intro1')) + '<b>' + money(min) + '</b>' + esc(t('intro2')) + '<br>' + esc(t('intro3')) + '<br>' + btns);
    };

    /* --- Détection d'un budget dans le texte libre de la cliente --- */
    function detecterBudget(q) {
        if (!q) return null;
        var s = ' ' + String(q).toLowerCase().replace(/\s+/g, ' ') + ' ';
        /* Ne pas intercepter la puce existante « Moins de 25 $ » (réponse v3 déjà en place). */
        try {
            var cheap = (typeof bbT === 'function') ? String(bbT('ai.cheap')).toLowerCase() : '';
            if (cheap && s.trim() === cheap.trim()) return null;
        } catch (e) {}
        if (/\bbudget\b/.test(s) && !/\d/.test(s)) return 'menu';
        var m = s.match(/(\d{1,4})\s*(?:\$|dollars?|bucks?)/) || s.match(/\bbudget\b[^0-9]{0,12}(\d{1,4})/) || s.match(/(?:moins de|maximum|max|environ|autour de|j'ai|je dispose de|il me reste)\s*(\d{1,4})\s*(?:\$|dollars?)?/);
        if (!m) return null;
        var n = parseInt(m[1], 10);
        if (!(n >= 5 && n <= 999)) return null;
        return n;
    }

    /* --- Enveloppe sur bbAiAnswer : budget détecté -> réponse budget, sinon réponse d'origine --- */
    function brancher() {
        if (typeof window.bbAiAnswer !== 'function' || window.bbAiAnswer.__budgetBranche) return false;
        var original = window.bbAiAnswer;
        var enveloppe = function (q) {
            var b = detecterBudget(q);
            if (b === 'menu') { window.bbBudgetOpen(); return; }
            if (typeof b === 'number') { if (b > 100) { afficherPlafond(b); } else { afficherPlafond(b); } return; }
            return original(q);
        };
        enveloppe.__budgetBranche = true;
        window.bbAiAnswer = enveloppe;
        return true;
    }

    /* --- Bouton « Mon budget » dans la rangée de suggestions --- */
    function ajouterBouton() {
        var box = document.getElementById('bbAiChips');
        if (!box || !box.children.length) return;
        if (document.getElementById('bbBudgetChip')) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.id = 'bbBudgetChip';
        b.textContent = t('chip');
        b.addEventListener('click', function () { window.bbBudgetOpen(); });
        box.appendChild(b);
    }
    function observerPuces() {
        var box = document.getElementById('bbAiChips');
        if (!box) return false;
        ajouterBouton();
        try {
            new MutationObserver(function () { ajouterBouton(); }).observe(box, { childList: true });
        } catch (e) {}
        return true;
    }

    /* --- Démarrage patient : attendre le panneau et les fonctions du clavardage --- */
    var essais = 0;
    var minuterie = setInterval(function () {
        essais++;
        var okFns = brancher();
        var okObs = observerPuces();
        if ((okFns && okObs) || essais > 40) clearInterval(minuterie);
    }, 300);
})();
