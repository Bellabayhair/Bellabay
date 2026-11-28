/* ============================================================
   BELLA IA v2 — copie du correctif Pinky (2026-11-27).
   AUCUNE modification fonctionnelle dans ce fichier : les garde-fous
   du correctif sont preserves a l'identique (amazon.ca dans la liste
   blanche, Pinterest @bellabayca, aucun pourcentage ambassadrice).
   L'enrichissement v3 vit dans index.corrige.v2.html (bloc Bella IA v3).
   ============================================================ */
/* ============================================================================
   BELLA IA + PINKY — v5 (2026-11-25)
   Mascotte Pinky, Beauty Match, Complete Your Look, verification des liens,
   rappel panier (avec consentement), Beauty Boxes, Tendances, tableau securite.
   100 % navigateur, 0 $, aucune donnee envoyee, aucune cle, aucun secret.
   Ne modifie jamais le code de base : ce fichier s'ajoute et se branche sur
   les fonctions existantes (bbFindProduct, bbOpenProduct, bbRecommendations,
   bbRecCardHtml, addToCart, bbAiOpen, bbMoney, bbEscapeHtml, bbT, bbLang).
   ============================================================================ */
(function () {
    'use strict';

    /* ---------- Petits utilitaires (repli si les fonctions de base manquent) ---------- */
    function esc(s) {
        if (typeof bbEscapeHtml === 'function') return bbEscapeHtml(s);
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function money(n) {
        if (typeof bbMoney === 'function') return bbMoney(n);
        return Number(n).toFixed(2).replace('.', ',') + ' $ CAD';
    }
    function lang() { return (typeof bbLang === 'string' && bbLang === 'en') ? 'en' : 'fr'; }
    function titleOf(p) {
        if (typeof bbTranslateTitle === 'function') return bbTranslateTitle(p.title, lang());
        if (p.t && p.t.en && lang() === 'en') return p.t.en;
        return p.title;
    }
    function findProduct(id) {
        if (typeof bbFindProduct === 'function') return bbFindProduct(id);
        return null;
    }
    function priceOf(p) { return (typeof p.priceCAD === 'number') ? p.priceCAD : (typeof p.price === 'number' ? p.price : null); }

    /* ---------- Textes FR / EN ---------- */
    var TXT = {
        fr: {
            pinkyHello: 'Bonjour, je suis Pinky. Je veille sur ce site et je t’avertis si un lien me semble suspect.',
            pinkyWatch: 'Surveillance active',
            pinkyLinksOk: 'liens officiels vérifiés',
            pinkyNoAlert: 'aucune alerte aujourd’hui',
            pinkyLimit: 'Je surveille les liens de ce site. La protection de tes comptes (mot de passe, double authentification) se fait dans chaque compte — Google, PayPal, Amazon, Meta — pas sur ce site.',
            talkToAi: 'Parler à Bella IA',
            findLook: 'Trouver mon look',
            boxes: 'Coffrets Bella Bay',
            security: 'Sécurité du site',
            warnTitle: 'Pinky t’arrête ici',
            warnText: 'Ce lien ne fait pas partie des liens officiels de Bella Bay. Il peut être une imitation : ne donne jamais ton mot de passe ni tes informations de paiement après avoir cliqué un lien inconnu.',
            warnUrl: 'Lien signalé :',
            warnBack: 'Revenir en sécurité',
            warnGo: 'Ouvrir quand même',
            warnLogged: 'Cette alerte est notée dans le tableau de sécurité (Espace Bella Bay, en bas de page).',
            lookTitle: 'Complétez votre look',
            lookSub: 'Pour aller avec ce produit, Bella Bay vous suggère :',
            cartReminderTitle: 'Rappel de panier',
            cartReminderText: 'Cochez cette case si vous voulez que Bella Bay vous rappelle votre panier. Bella IA vous rappellera votre panier automatiquement lors de votre prochaine visite.',
            cartReminderOn: 'Rappel activé : Bella IA vous rappellera votre panier automatiquement lors de votre prochaine visite.',
            cartToast: 'vous avez laissé',
            cartToastEnd: 'article(s) dans votre panier.',
            cartToastSee: 'Voir mon panier',
            cartToastClose: 'Fermer',
            matchEmpty: 'Aucun produit ne correspond à ces choix pour le moment. Essayez un budget plus large ou une autre catégorie.',
            matchAbove: 'Juste au-dessus de votre budget :',
            matchInBudget: 'Votre sélection Bella Bay',
            matchDelivery: 'Livraison :',
            matchSee: 'Voir',
            matchAdd: '+ Panier'
        },
        en: {
            pinkyHello: 'Hello, I’m Pinky. I watch over this site and warn you if a link looks suspicious.',
            pinkyWatch: 'Watch active',
            pinkyLinksOk: 'official links checked',
            pinkyNoAlert: 'no alert today',
            pinkyLimit: 'I watch the links on this site. Protecting your accounts (password, two-factor authentication) happens inside each account — Google, PayPal, Amazon, Meta — not on this site.',
            talkToAi: 'Talk to Bella IA',
            findLook: 'Find my look',
            boxes: 'Bella Bay gift boxes',
            security: 'Site security',
            warnTitle: 'Pinky is stopping you here',
            warnText: 'This link is not one of Bella Bay’s official links. It could be an imitation: never enter your password or payment details after clicking an unknown link.',
            warnUrl: 'Flagged link:',
            warnBack: 'Go back safely',
            warnGo: 'Open anyway',
            warnLogged: 'This alert is recorded in the security dashboard (Bella Bay Space, at the bottom of the page).',
            lookTitle: 'Complete your look',
            lookSub: 'To go with this product, Bella Bay suggests:',
            cartReminderTitle: 'Cart reminder',
            cartReminderText: 'Tick this box if you want Bella Bay to remind you about your cart. Bella IA will automatically remind you about your cart on your next visit.',
            cartReminderOn: 'Reminder on: Bella IA will automatically remind you about your cart on your next visit.',
            cartToast: 'you left',
            cartToastEnd: 'item(s) in your cart.',
            cartToastSee: 'View my cart',
            cartToastClose: 'Close',
            matchEmpty: 'No product matches these choices yet. Try a wider budget or another category.',
            matchAbove: 'Just above your budget:',
            matchInBudget: 'Your Bella Bay selection',
            matchDelivery: 'Delivery:',
            matchSee: 'View',
            matchAdd: '+ Cart'
        }
    };
    function t(k) { var L = TXT[lang()] || TXT.fr; return L[k] || TXT.fr[k] || k; }

    /* ==========================================================================
       1. PINKY — mascotte interactive reliee a Bella IA
       v5.1 : Pinky n'apparait plus a l'entree (ni bouton flottant, ni panneau,
       ni bulle). Elle ne sort plus que dans Bella IA pour la securite, et
       dans la modale d'alerte lien suspect + le tableau de securite.
       Visuel : illustration SVG (leopard stylise, yeux roses). Ce n’est pas
       une photo d’un vrai animal et ce n’est pas le logo officiel v4.
       ========================================================================== */
    var PINKY_SVG = '<svg viewBox="0 0 120 120" role="img" aria-label="Pinky – Protection & Sécurité" xmlns="http://www.w3.org/2000/svg">'
        + '<defs><radialGradient id="bbPinkyFace" cx="50%" cy="38%" r="75%"><stop offset="0%" stop-color="#fbe3ec"/><stop offset="60%" stop-color="#f3c6d8"/><stop offset="100%" stop-color="#e7a9c4"/></radialGradient>'
        + '<radialGradient id="bbPinkyEye" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff8fc0"/><stop offset="55%" stop-color="#d63384"/><stop offset="100%" stop-color="#8a2a5c"/></radialGradient></defs>'
        + '<path d="M28 34 L20 8 L46 20 Z" fill="#e7a9c4" stroke="#8a5a6b" stroke-width="1.5"/>'
        + '<path d="M92 34 L100 8 L74 20 Z" fill="#e7a9c4" stroke="#8a5a6b" stroke-width="1.5"/>'
        + '<path d="M31 30 L26 14 L41 22 Z" fill="#fbe3ec"/>'
        + '<path d="M89 30 L94 14 L79 22 Z" fill="#fbe3ec"/>'
        + '<ellipse cx="60" cy="66" rx="42" ry="40" fill="url(#bbPinkyFace)" stroke="#8a5a6b" stroke-width="1.5"/>'
        + '<circle cx="34" cy="44" r="4" fill="#8a5a6b" opacity=".55"/><circle cx="90" cy="52" r="3" fill="#8a5a6b" opacity=".55"/><circle cx="84" cy="34" r="2.4" fill="#8a5a6b" opacity=".45"/><circle cx="40" cy="88" r="2.6" fill="#8a5a6b" opacity=".4"/><circle cx="76" cy="92" r="2.2" fill="#8a5a6b" opacity=".4"/>'
        + '<ellipse cx="44" cy="60" rx="10" ry="7" fill="url(#bbPinkyEye)"/><ellipse cx="76" cy="60" rx="10" ry="7" fill="url(#bbPinkyEye)"/>'
        + '<ellipse cx="42" cy="58" rx="3.2" ry="2.4" fill="#fff" opacity=".9"/><ellipse cx="74" cy="58" rx="3.2" ry="2.4" fill="#fff" opacity=".9"/>'
        + '<circle cx="44" cy="60" r="3.4" fill="#2b1020"/><circle cx="76" cy="60" r="3.4" fill="#2b1020"/>'
        + '<path d="M54 78 Q60 82 66 78 Q60 88 54 78 Z" fill="#8a2a5c"/>'
        + '<path d="M60 84 L60 90 M60 90 Q54 96 48 92 M60 90 Q66 96 72 92" fill="none" stroke="#8a5a6b" stroke-width="1.6" stroke-linecap="round"/>'
        + '<path d="M22 74 L36 78 M24 84 L37 82 M98 74 L84 78 M96 84 L83 82" stroke="#8a5a6b" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>'
        + '</svg>';

    window.bbPinkySVG = PINKY_SVG;

    function pinkyAlertsToday() {
        try {
            var list = JSON.parse(localStorage.getItem('bbPinkyAlerts') || '[]');
            var today = new Date().toISOString().slice(0, 10);
            return list.filter(function (a) { return (a.date || '').slice(0, 10) === today; }).length;
        } catch (e) { return 0; }
    }
    function pinkyUpdateStatus() {
        var el = document.getElementById('bbPinkyStatus');
        if (!el) return;
        var n = (window.__bbPinkyLinksChecked || 0);
        var alerts = pinkyAlertsToday();
        el.textContent = t('pinkyWatch') + ' — ' + n + ' ' + t('pinkyLinksOk')
            + ' · ' + (alerts ? alerts + ' alerte(s)' : t('pinkyNoAlert'));
    }
    /* v5.1 : le panneau Pinky n'existe plus ; garde pour compatibilite (bbPinkyShowAdmin l'appelle). */
    window.bbPinkyClose = function () {};
    window.bbPinkyShowAdmin = function () {
        window.bbPinkyClose();
        var s = document.getElementById('bbSecurityAdmin');
        if (!s) return;
        s.hidden = false;
        if (typeof window.bbPinkyRenderAdmin === 'function') window.bbPinkyRenderAdmin();
        s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.bbPinkyHideAdmin = function () {
        var s = document.getElementById('bbSecurityAdmin');
        if (s) s.hidden = true;
    };


    /* ==========================================================================
       5. SECURITE — verification des liens + alertes Pinky + tableau admin
       Liste autorisee : uniquement les contacts et reseaux officiels confirmes
       de Bella Bay + PayPal (paiement) + les CDN des polices et icones.
       Tout autre lien externe = avertissement Pinky + alerte enregistree.
       ========================================================================== */
    var ALLOWED = [
        { host: 'bellabay.ca', path: null },
        { host: 'www.bellabay.ca', path: null },
        { host: 'wa.me', path: '/15145822856' },
        { host: 'www.facebook.com', path: '/bellabay.coiffure' },
        { host: 'facebook.com', path: '/bellabay.coiffure' },
        { host: 'www.instagram.com', path: '/bella.bay.beauty/' },
        { host: 'instagram.com', path: '/bella.bay.beauty/' },
        { host: 'www.tiktok.com', path: '/@bella.bay82' },
        { host: 'tiktok.com', path: '/@bella.bay82' },
        { host: 'ca.pinterest.com', path: '/bellabayca/' },
        { host: 'www.pinterest.com', path: '/bellabayca/' },
        { host: 'www.google.com', path: '/maps/search/Bella+Bay+Laval' },
        { host: 'google.com', path: '/maps/search/Bella+Bay+Laval' },
        { host: 'www.youtube.com', path: '/@BB_Kids_story' },
        { host: 'youtube.com', path: '/@BB_Kids_story' },
        { host: 'www.paypal.com', path: null },
        { host: 'paypal.com', path: null },
        { host: 'www.amazon.ca', path: null },
        { host: 'amazon.ca', path: null },
        { host: 'cdnjs.cloudflare.com', path: null },
        { host: 'fonts.googleapis.com', path: null },
        { host: 'fonts.gstatic.com', path: null }
    ];
    var SHORTENERS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'cutt.ly', 'rb.gy', 'is.gd', 'shorte.st', 'ow.ly'];

    function bbPinkyCheckUrl(raw) {
        if (!raw) return { ok: true, reason: '' };
        var href = String(raw).trim();
        if (href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return { ok: true, reason: '' };
        if (/^(mailto|tel):/i.test(href)) {
            if (/^mailto:bellabay\.coiffure@gmail\.com/i.test(href)) return { ok: true, reason: '' };
            if (/^tel:\+?15145822856/i.test(href)) return { ok: true, reason: '' };
            return { ok: false, reason: 'contact non officiel' };
        }
        var u;
        try { u = new URL(href, window.location.href); } catch (e) { return { ok: false, reason: 'adresse illisible' }; }
        if (u.protocol !== 'https:') return { ok: false, reason: 'lien non sécurisé (pas HTTPS)' };
        if (u.hostname === window.location.hostname) return { ok: true, reason: '' };
        var host = u.hostname.toLowerCase();
        if (SHORTENERS.indexOf(host) !== -1) return { ok: false, reason: 'lien raccourci — destination masquée' };
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.indexOf('xn--') !== -1) return { ok: false, reason: 'adresse suspecte' };
        for (var i = 0; i < ALLOWED.length; i++) {
            if (ALLOWED[i].host === host) {
                if (!ALLOWED[i].path) return { ok: true, reason: '' };
                if (u.pathname.toLowerCase().indexOf(ALLOWED[i].path.toLowerCase()) === 0) return { ok: true, reason: '' };
                return { ok: false, reason: 'page non officielle sur un domaine connu' };
            }
        }
        if (host.indexOf('bellabay') !== -1) return { ok: false, reason: 'domaine ressemblant à bellabay.ca — possible imitation' };
        return { ok: false, reason: 'lien externe non vérifié' };
    }
    window.bbPinkyCheckUrl = bbPinkyCheckUrl;

    function bbPinkyLogAlert(url, reason) {
        try {
            var list = JSON.parse(localStorage.getItem('bbPinkyAlerts') || '[]');
            list.unshift({ date: new Date().toISOString(), url: String(url).slice(0, 300), reason: reason });
            if (list.length > 50) list.length = 50;
            localStorage.setItem('bbPinkyAlerts', JSON.stringify(list));
        } catch (e) {}
    }

    var __bbPinkyPendingUrl = null;
    function bbPinkyShowWarning(url, reason) {
        var m = document.getElementById('bbPinkyWarnModal');
        if (!m) { window.open(url, '_blank', 'noopener'); return; }
        __bbPinkyPendingUrl = url;
        var u = document.getElementById('bbPinkyWarnUrl');
        if (u) u.textContent = url;
        var r = document.getElementById('bbPinkyWarnReason');
        if (r) r.textContent = reason;
        m.classList.add('active');
        document.body.classList.add('modal-open');
    }
    window.bbPinkyWarnClose = function () {
        var m = document.getElementById('bbPinkyWarnModal');
        if (m) m.classList.remove('active');
        document.body.classList.remove('modal-open');
        __bbPinkyPendingUrl = null;
    };
    window.bbPinkyWarnGo = function () {
        var url = __bbPinkyPendingUrl;
        window.bbPinkyWarnClose();
        if (url) window.open(url, '_blank', 'noopener');
    };

    /* Interception des clics sur les liens externes (capture, avant navigation). */
    document.addEventListener('click', function (ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!a) return;
        if (a.hasAttribute('data-bb-pinky-skip')) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return;
        var abs;
        try { abs = new URL(href, window.location.href).href; } catch (e) { return; }
        var check = bbPinkyCheckUrl(abs);
        if (check.ok) return;
        ev.preventDefault();
        ev.stopPropagation();
        bbPinkyLogAlert(abs, check.reason);
        pinkyUpdateStatus();
        bbPinkyShowWarning(abs, check.reason);
    }, true);

    /* Verification au chargement : tous les liens de la page sont controles. */
    function bbPinkyScanLinks() {
        var links = document.querySelectorAll('a[href]');
        var checked = 0, unknown = 0;
        links.forEach(function (a) {
            var href = a.getAttribute('href');
            if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return;
            var abs;
            try { abs = new URL(href, window.location.href).href; } catch (e) { return; }
            checked += 1;
            var c = bbPinkyCheckUrl(abs);
            if (!c.ok) {
                unknown += 1;
                a.setAttribute('data-bb-pinky', 'unverified');
                a.setAttribute('title', 'Lien externe non vérifié par Bella Bay');
                bbPinkyLogAlert(abs, 'lien présent sur la page : ' + c.reason);
            }
        });
        window.__bbPinkyLinksChecked = checked;
        window.__bbPinkyLinksUnknown = unknown;
        pinkyUpdateStatus();
    }

    /* ---------- Tableau de securite (administratrice) ---------- */
    window.bbPinkyRenderAdmin = function () {
        var box = document.getElementById('bbPinkyAlertsList');
        if (!box) return;
        var list = [];
        try { list = JSON.parse(localStorage.getItem('bbPinkyAlerts') || '[]'); } catch (e) {}
        if (!list.length) {
            box.innerHTML = '<p style="color:#5b2333;">Aucune alerte enregistrée. Pinky n’a rien signalé de suspect pour le moment.</p>';
        } else {
            box.innerHTML = '<table class="bb-pinky-table"><thead><tr><th>Date</th><th>Lien signalé</th><th>Raison</th></tr></thead><tbody>'
                + list.map(function (a) {
                    var d = (a.date || '').replace('T', ' ').slice(0, 19);
                    return '<tr><td>' + esc(d) + '</td><td style="word-break:break-all;">' + esc(a.url) + '</td><td>' + esc(a.reason) + '</td></tr>';
                }).join('') + '</tbody></table>';
        }
        var proto = document.getElementById('bbPinkyProto');
        if (proto) proto.textContent = (window.location.protocol === 'https:') ? 'Oui — connexion sécurisée (HTTPS)' : 'Non — cette page n’est pas en HTTPS, vérifiez l’adresse (bellabay.ca).';
        var sdk = document.getElementById('bbPinkyPaypal');
        if (sdk) sdk.textContent = (typeof window.paypal !== 'undefined') ? 'Oui — bouton PayPal chargé' : 'Non chargé sur cette page (le paiement PayPal ne s’affichera pas).';
        var scan = document.getElementById('bbPinkyScan');
        if (scan) scan.textContent = (window.__bbPinkyLinksChecked || 0) + ' liens vérifiés, ' + (window.__bbPinkyLinksUnknown || 0) + ' lien(s) non vérifié(s) sur cette page.';
    };
    window.bbPinkyClearAlerts = function () {
        try { localStorage.removeItem('bbPinkyAlerts'); } catch (e) {}
        window.bbPinkyRenderAdmin();
        pinkyUpdateStatus();
    };

    /* ==========================================================================
       2. BEAUTY MATCH — questionnaire (style, produits, budget, accessoires,
       pays) + selection dans le VRAI catalogue (240 produits, prix reels).
       Livraison mondiale : tous les produits sont proposes partout, avec la
       note de livraison du pays choisi (section Livraison internationale).
       ========================================================================== */
    var BM_STEPS = [
        { key: 'style', q: { fr: 'Quel style recherchez-vous ?', en: 'What style are you looking for?' }, options: [
            { v: 'naturel', fr: 'Naturel & lumineux', en: 'Natural & glowing' },
            { v: 'glamour', fr: 'Glamour & soirée', en: 'Glamour & evening' },
            { v: 'romantique', fr: 'Doux & romantique', en: 'Soft & romantic' },
            { v: 'audacieux', fr: 'Audacieux & tendance', en: 'Bold & trendy' } ] },
        { key: 'interests', q: { fr: 'Quels produits vous intéressent ? (plusieurs choix possibles)', en: 'Which products interest you? (pick several)' }, multi: true, options: [
            { v: 'cheveux', fr: 'Cheveux — shampooing, soins', en: 'Hair — shampoo, care' },
            { v: 'maquillage', fr: 'Maquillage — lèvres, teint, yeux', en: 'Makeup — lips, skin, eyes' },
            { v: 'cils', fr: 'Cils & regard', en: 'Lashes & eyes' },
            { v: 'bijoux', fr: 'Bijoux', en: 'Jewellery' },
            { v: 'ongles', fr: 'Ongles press-on', en: 'Press-on nails' },
            { v: 'soins', fr: 'Soins visage & corps', en: 'Face & body care' },
            { v: 'extensions', fr: 'Extensions capillaires', en: 'Hair extensions' },
            { v: 'coffrets', fr: 'Coffrets cadeaux', en: 'Gift boxes' } ] },
        { key: 'budget', q: { fr: 'Quel est votre budget ?', en: 'What is your budget?' }, options: [
            { v: '25', fr: 'Moins de 25 $ CAD', en: 'Under $25 CAD' },
            { v: '50', fr: '25 $ à 50 $ CAD', en: '$25 to $50 CAD' },
            { v: '100', fr: '50 $ à 100 $ CAD', en: '$50 to $100 CAD' },
            { v: '9999', fr: '100 $ CAD et plus', en: '$100 CAD and more' } ] },
        { key: 'accessories', q: { fr: 'Quels accessoires souhaitez-vous ?', en: 'Which accessories would you like?' }, options: [
            { v: 'bijoux', fr: 'Bijoux assortis', en: 'Matching jewellery' },
            { v: 'outils', fr: 'Brosses, pinceaux & outils', en: 'Brushes & tools' },
            { v: 'coffrets', fr: 'Coffrets cadeaux', en: 'Gift boxes' },
            { v: 'aucun', fr: 'Aucun en particulier', en: 'None in particular' } ] },
        { key: 'country', q: { fr: 'Dans quel pays habitez-vous ?', en: 'Which country do you live in?' }, options: [
            { v: 'ca', fr: 'Canada', en: 'Canada' },
            { v: 'us', fr: 'États-Unis', en: 'United States' },
            { v: 'fr', fr: 'France', en: 'France' },
            { v: 'uk', fr: 'Royaume-Uni', en: 'United Kingdom' },
            { v: 'be', fr: 'Belgique', en: 'Belgium' },
            { v: 'ch', fr: 'Suisse', en: 'Switzerland' },
            { v: 'ae', fr: 'Émirats arabes unis', en: 'United Arab Emirates' },
            { v: 'au', fr: 'Australie', en: 'Australia' },
            { v: 'autre', fr: 'Autre pays', en: 'Other country' } ] }
    ];
    var BM_COUNTRY_NOTE = {
        ca: { fr: 'Canada — livraison gratuite, normale 7 à 15 jours, express 3 à 5 jours. Aucuns droits de douane.', en: 'Canada — free delivery, standard 7 to 15 days, express 3 to 5 days. No customs duties.' },
        us: { fr: 'États-Unis — prix en CAD, convertis en USD par PayPal au paiement. Livraison gratuite, 7 à 15 jours. Droits de douane et taxes éventuels à votre charge.', en: 'United States — prices in CAD, converted to USD by PayPal at checkout. Free delivery, 7 to 15 days. Any customs duties and taxes are yours to pay.' },
        fr: { fr: 'France — prix en CAD, convertis en euros par PayPal au paiement. Livraison gratuite, 7 à 15 jours. Droits de douane et TVA éventuels à votre charge, payables à la livraison.', en: 'France — prices in CAD, converted to euros by PayPal at checkout. Free delivery, 7 to 15 days. Any customs duties and VAT are yours to pay on delivery.' },
        uk: { fr: 'Royaume-Uni — prix en CAD, convertis en livres sterling par PayPal au paiement. Livraison gratuite, 7 à 15 jours. Droits de douane et TVA éventuels à votre charge.', en: 'United Kingdom — prices in CAD, converted to pounds sterling by PayPal at checkout. Free delivery, 7 to 15 days. Any customs duties and VAT are yours to pay.' },
        be: { fr: 'Belgique — livraison mondiale, 7 à 15 jours. Prix en CAD, convertis en euros par PayPal au paiement. Droits de douane et TVA éventuels à votre charge.', en: 'Belgium — worldwide delivery, 7 to 15 days. Prices in CAD, converted to euros by PayPal at checkout. Any customs duties and VAT are yours to pay.' },
        ch: { fr: 'Suisse — livraison mondiale, 7 à 15 jours. Prix en CAD, convertis par PayPal au paiement. Droits de douane et taxes éventuels à votre charge.', en: 'Switzerland — worldwide delivery, 7 to 15 days. Prices in CAD, converted by PayPal at checkout. Any customs duties and taxes are yours to pay.' },
        ae: { fr: 'Émirats arabes unis — livraison mondiale, 7 à 15 jours. Prix en CAD, convertis par PayPal au paiement. Droits de douane et taxes éventuels à votre charge.', en: 'United Arab Emirates — worldwide delivery, 7 to 15 days. Prices in CAD, converted by PayPal at checkout. Any customs duties and taxes are yours to pay.' },
        au: { fr: 'Australie — livraison mondiale, 7 à 15 jours. Prix en CAD, convertis par PayPal au paiement. Droits de douane et taxes éventuels à votre charge.', en: 'Australia — worldwide delivery, 7 to 15 days. Prices in CAD, converted by PayPal at checkout. Any customs duties and taxes are yours to pay.' },
        autre: { fr: 'Autre pays — livraison mondiale, 7 à 15 jours selon votre pays. Prix en CAD, convertis dans votre devise par PayPal au paiement. Droits de douane, taxes et restrictions locales à votre charge — vérifiez la réglementation de votre pays avant de commander.', en: 'Other country — worldwide delivery, 7 to 15 days depending on your country. Prices in CAD, converted to your currency by PayPal at checkout. Customs duties, taxes and local restrictions are yours to pay — check your country’s rules before ordering.' }
    };
    var BM_INTEREST_KW = {
        cheveux: ['shampooing', 'conditioner', 'revitalisant', 'mousse', 'spray', 'luxe', 'cheveux', 'capillaire'],
        maquillage: ['rouge à lèvres', 'lipstick', 'gloss', 'mascara', 'fard', 'blush', 'fond de teint', 'poudre', 'pinceau', 'eyeliner', 'palette', 'correcteur'],
        cils: ['cils', 'lash', 'sourcil'],
        bijoux: ['collier', 'boucle', 'bague', 'bracelet', 'coffret perle', 'ensemble bohème'],
        ongles: ['ongle', 'press-on', 'siyou'],
        soins: ['crème', 'sérum', 'masque glow', 'beurre', 'gel douche', 'savon', 'huile', 'soin'],
        extensions: ['extension'],
        coffrets: ['coffret', 'panier']
    };
    var BM_STYLE_KW = {
        naturel: ['naturel', 'nude', 'beige', 'au naturel', 'doux', 'repair', 'clear', 'coconut', 'cream'],
        glamour: ['rouge', 'gold', '24k', 'paillet', 'audacity', 'luxe', 'coffret', 'soirée'],
        romantique: ['rose', 'perle', 'papillon', 'bohème', 'blush', 'satin', 'fleur', 'honey'],
        audacieux: ['red', 'fire', 'plum', 'wine', 'dark', '24k', 'paillet', 'spicy', 'charcoal']
    };
    var BM_ACCESSORY_KW = {
        bijoux: ['collier', 'boucle', 'bague', 'bracelet', 'coffret perle', 'ensemble bohème'],
        outils: ['pinceau', 'prima3000', 'portofino', 'rapido', 'styleswitch'],
        coffrets: ['coffret', 'panier'],
        aucun: []
    };

    var bmState = { step: 0, answers: {} };

    function bmText(o) { return (lang() === 'en' && o.en) ? o.en : o.fr; }
    function bmHaystack(p) {
        return ((p.title || '') + ' ' + (p.tag || '') + ' ' + (p.desc || '') + ' ' + (p.category || '')).toLowerCase();
    }
    function bmScore(p, a) {
        var hay = bmHaystack(p), interest = 0, extra = 0;
        (a.interests || []).forEach(function (it) {
            var kws = BM_INTEREST_KW[it] || [];
            if (it === 'bijoux' && p.category === 'bijoux') interest += 3;
            else if (it === 'ongles' && p.category === 'ongles') interest += 3;
            else if (it === 'extensions' && p.category === 'extensions') interest += 3;
            else kws.forEach(function (k) { if (hay.indexOf(k) !== -1) interest += 3; });
        });
        (BM_STYLE_KW[a.style] || []).forEach(function (k) { if (hay.indexOf(k) !== -1) extra += 2; });
        (BM_ACCESSORY_KW[a.accessories] || []).forEach(function (k) { if (hay.indexOf(k) !== -1) extra += 2; });
        /* Sans aucun point d’intérêt, le produit n’est pas proposé : le style
           seul ne suffit pas (sinon un budget « extensions » à 25 $ proposerait
           des rouges à lèvres). */
        if (interest <= 0) return 0;
        return interest * 10 + extra;
    }
    function bmCompute(a) {
        if (typeof bbProducts === 'undefined' || !bbProducts.length) return { inBudget: [], above: [] };
        var max = parseFloat(a.budget || '9999');
        var scored = bbProducts.map(function (p) {
            return { p: p, score: bmScore(p, a), price: priceOf(p) };
        }).filter(function (x) { return x.price != null && x.score > 0; });
        scored.sort(function (x, y) { return (y.score - x.score) || (x.price - y.price); });
        var inBudget = scored.filter(function (x) { return x.price <= max; }).slice(0, 6);
        var above = [];
        if (inBudget.length < 3) {
            above = scored.filter(function (x) { return x.price > max; }).slice(0, 3 - inBudget.length);
        }
        return { inBudget: inBudget, above: above };
    }
    function bmCardHtml(x, aboveFlag) {
        var p = x.p, name = titleOf(p);
        var img = p.img
            ? '<img src="' + esc(p.img) + '" alt="' + esc(name).replace(/"/g, '') + '" loading="lazy">'
            : '<div style="height:90px;display:flex;align-items:center;justify-content:center;background:#fdf2f5;color:#d63384;font-weight:700;">B.B</div>';
        return '<div class="bb-rec-card">' + img
            + '<strong>' + esc(name) + '</strong>'
            + '<span>' + money(x.price) + (aboveFlag ? ' · ' + t('matchAbove') : '') + '</span>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
            + '<button type="button" onclick="bbPinkyMatchView(\'' + p.id + '\')">' + t('matchSee') + '</button>'
            + '<button type="button" class="bb-rec-add" onclick="bbPinkyMatchAdd(\'' + p.id + '\')">' + t('matchAdd') + '</button>'
            + '</div></div>';
    }
    window.bbPinkyMatchView = function (id) {
        window.bbBeautyMatchClose();
        if (typeof bbOpenProduct === 'function') bbOpenProduct(id);
    };
    window.bbPinkyMatchAdd = function (id) {
        if (typeof addToCart === 'function') addToCart(id);
    };

    function bmRender() {
        var box = document.getElementById('bbBeautyMatchContent');
        if (!box) return;
        var step = BM_STEPS[bmState.step];
        var html = '<div class="modal-number">Beauty Match · ' + (lang() === 'en' ? 'Question ' : 'Question ') + (bmState.step + 1) + ' / ' + BM_STEPS.length + '</div>'
            + '<h2>' + esc(bmText(step.q)) + '</h2>'
            + '<div class="bb-bm-options">';
        step.options.forEach(function (o) {
            var sel = false;
            if (step.multi) sel = (bmState.answers[step.key] || []).indexOf(o.v) !== -1;
            else sel = bmState.answers[step.key] === o.v;
            html += '<button type="button" class="bb-bm-opt' + (sel ? ' selected' : '') + '" data-bm-key="' + step.key + '" data-bm-val="' + o.v + '" data-bm-multi="' + (step.multi ? '1' : '0') + '">' + esc(bmText(o)) + '</button>';
        });
        html += '</div><div class="bb-bm-nav">';
        if (bmState.step > 0) html += '<button type="button" class="bb-bm-back" onclick="bbBeautyMatchBack()">← ' + (lang() === 'en' ? 'Back' : 'Retour') + '</button>';
        if (step.multi) html += '<button type="button" class="bb-bm-next" onclick="bbBeautyMatchNext()">' + (lang() === 'en' ? 'Continue' : 'Continuer') + ' →</button>';
        html += '</div>';
        if (step.multi) html += '<p style="font-size:12px;color:#8a5a6b;">' + (lang() === 'en' ? 'Pick at least one, then press Continue.' : 'Choisissez au moins un produit, puis appuyez sur Continuer.') + '</p>';
        box.innerHTML = html;
        box.querySelectorAll('.bb-bm-opt').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = btn.getAttribute('data-bm-key'), val = btn.getAttribute('data-bm-val');
                var multi = btn.getAttribute('data-bm-multi') === '1';
                if (multi) {
                    var arr = bmState.answers[key] || [];
                    var i = arr.indexOf(val);
                    if (i === -1) arr.push(val); else arr.splice(i, 1);
                    bmState.answers[key] = arr;
                    btn.classList.toggle('selected');
                } else {
                    bmState.answers[key] = val;
                    bmState.step += 1;
                    if (bmState.step >= BM_STEPS.length) bmShowResults();
                    else bmRender();
                }
            });
        });
    }
    function bmShowResults() {
        var box = document.getElementById('bbBeautyMatchContent');
        if (!box) return;
        var a = bmState.answers;
        var res = bmCompute(a);
        var country = BM_COUNTRY_NOTE[a.country] || BM_COUNTRY_NOTE.autre;
        var html = '<div class="modal-number">💗 Beauty Match — Bella Bay</div>'
            + '<h2>' + esc(t('matchInBudget')) + '</h2>'
            + '<p style="font-size:13px;color:#5b2333;">' + esc(t('matchDelivery')) + ' ' + esc(bmText(country)) + '</p>';
        if (!res.inBudget.length && !res.above.length) {
            html += '<p>' + esc(t('matchEmpty')) + '</p>';
        } else {
            if (res.inBudget.length) {
                html += '<div class="bb-rec-row">' + res.inBudget.map(function (x) { return bmCardHtml(x, false); }).join('') + '</div>';
            }
            if (res.above.length) {
                html += '<h4 style="margin-top:16px;">' + esc(t('matchAbove')) + '</h4>'
                    + '<div class="bb-rec-row">' + res.above.map(function (x) { return bmCardHtml(x, true); }).join('') + '</div>';
            }
            html += '<p style="font-size:12px;color:#8a5a6b;">' + (lang() === 'en'
                ? 'Prices in CAD. −10% with the code BELLA at checkout. Real products from the Bella Bay catalogue, available on bellabay.ca.'
                : 'Prix en CAD. −10 % avec le code BELLA à la caisse. Vrais produits du catalogue Bella Bay, disponibles sur bellabay.ca.') + '</p>';
        }
        html += '<div class="bb-bm-nav"><button type="button" class="bb-bm-back" onclick="bbBeautyMatchRestart()">↺ ' + (lang() === 'en' ? 'Start again' : 'Recommencer') + '</button>'
            + '<button type="button" class="bb-bm-next" onclick="bbBeautyMatchClose()">' + (lang() === 'en' ? 'Close' : 'Fermer') + '</button></div>';
        box.innerHTML = html;
    }
    window.bbBeautyMatchOpen = function () {
        bmState = { step: 0, answers: {} };
        var m = document.getElementById('bbBeautyMatchModal');
        if (!m) return;
        bmRender();
        m.classList.add('active');
        document.body.classList.add('modal-open');
    };
    window.bbBeautyMatchClose = function () {
        var m = document.getElementById('bbBeautyMatchModal');
        if (m) m.classList.remove('active');
        document.body.classList.remove('modal-open');
    };
    window.bbBeautyMatchCloseOutside = function (ev) { if (ev.target.id === 'bbBeautyMatchModal') window.bbBeautyMatchClose(); };
    window.bbBeautyMatchBack = function () { if (bmState.step > 0) { bmState.step -= 1; bmRender(); } };
    window.bbBeautyMatchNext = function () {
        var step = BM_STEPS[bmState.step];
        if (step.multi && !(bmState.answers[step.key] || []).length) return;
        bmState.step += 1;
        if (bmState.step >= BM_STEPS.length) bmShowResults();
        else bmRender();
    };
    window.bbBeautyMatchRestart = function () { bmState = { step: 0, answers: {} }; bmRender(); };

    /* ==========================================================================
       3. COMPLETE YOUR LOOK — complements sur chaque fiche produit (modale).
       Regles basees sur le VRAI catalogue. Aucune brosse n’est en vente sur le
       site pour le moment : les extensions suggerent donc les soins capillaires
       (shampooing, conditioner, spray) et le coffret trio — jamais une brosse
       inventee. Les regles « sac » et « piercing » sont dormantes : aucun sac
       ni piercing n’est au catalogue aujourd’hui, elles s’activeront d’elles-
       memes quand ces categories seront ajoutees.
       ========================================================================== */
    var PINKY_LOOK = {
        extensions: ['bb-daily-repair-shampoo', 'bb-daily-repair-conditioner', 'bb-luxe-leavein', 'bb-coffret-trio'],
        lipstick: ['bb-mascara', 'bb-stipple-blend-brush', 'bb-lip-gloss-warm-rose'],
        gloss: ['bb-mascara', 'bb-stipple-blend-brush', 'bb-lipstick-au-naturel'],
        mascara: ['bb-lash-rejuvenator', 'bb-cils-bande', 'bb-lip-gloss-warm-rose'],
        cils: ['bb-lash-rejuvenator', 'bb-mascara', 'bb-cils-magnetiques'],
        bijoux: ['bb-bijou-collier-papillon', 'bb-bijou-boucles-boheme', 'bb-bijou-bague-vague', 'bb-bijou-coffret-perle'],
        ongles: ['siyou-aurora', 'bb-coffret-ongles-siyou-duo', 'bb-coffret-ongles-soin'],
        soins: ['bb-glow-mask', 'bb-night-cream', 'bb-niacinamide'],
        cheveux: ['bb-daily-repair-shampoo', 'bb-daily-repair-conditioner', 'bb-luxe-leavein', 'bb-bounce-boost-mousse'],
        sacs: ['bb-bijou-collier-papillon', 'bb-bijou-boucles-boheme', 'bb-bijou-bracelet-cubain'],
        piercings: ['bb-bijou-collier-papillon', 'bb-bijou-boucles-boheme', 'bb-bijou-bague-vague']
    };
    function bbPinkyComplements(p, n) {
        n = n || 3;
        var out = [], seen = {};
        seen[p.id] = true;
        function push(id) {
            if (out.length >= n) return;
            if (seen[id]) return;
            var q = findProduct(id);
            if (q) { seen[id] = true; out.push(q); }
        }
        /* 1) Correspondances preparees par Bella Bay (BB_ROUTINE), si presentes. */
        try {
            if (typeof BB_ROUTINE !== 'undefined' && BB_ROUTINE[p.id]) BB_ROUTINE[p.id].forEach(push);
        } catch (e) {}
        /* 2) Regles par famille de produit. */
        var title = (p.title || '').toLowerCase();
        var cat = (p.category || '').toLowerCase();
        var rule = null;
        if (cat === 'extensions') rule = 'extensions';
        else if (cat === 'bijoux') rule = 'bijoux';
        else if (cat === 'ongles') rule = 'ongles';
        else if (cat === 'sacs' || title.indexOf('sac ') === 0 || title.indexOf('sac à main') !== -1) rule = 'sacs';
        else if (cat === 'piercings' || title.indexOf('piercing') !== -1) rule = 'piercings';
        else if (title.indexOf('rouge à lèvres') !== -1 || title.indexOf('lipstick') !== -1) rule = 'lipstick';
        else if (title.indexOf('gloss') !== -1) rule = 'gloss';
        else if (title.indexOf('mascara') !== -1) rule = 'mascara';
        else if (title.indexOf('cils') !== -1) rule = 'cils';
        else if (title.indexOf('shampooing') !== -1 || title.indexOf('conditioner') !== -1 || title.indexOf('mousse') !== -1) rule = 'cheveux';
        else if (title.indexOf('crème') !== -1 || title.indexOf('sérum') !== -1 || title.indexOf('masque') !== -1 || title.indexOf('beurre') !== -1) rule = 'soins';
        if (rule && PINKY_LOOK[rule]) PINKY_LOOK[rule].forEach(push);
        /* 3) Repli : les recommandations existantes du site. */
        if (out.length < n && typeof bbRecommendations === 'function') {
            bbRecommendations(p, n).forEach(function (q) { if (out.length < n && !seen[q.id]) { seen[q.id] = true; out.push(q); } });
        }
        return out;
    }
    window.bbPinkyComplements = bbPinkyComplements;

    function bbPinkyAppendLook() {
        var content = document.getElementById('bbProductModalContent');
        if (!content || content.querySelector('.bb-pinky-look')) return;
        var idMatch = null;
        var btn = content.querySelector('[onclick*="bbRecAdd"]');
        if (btn) { var m = btn.getAttribute('onclick').match(/'([^']+)'/); if (m) idMatch = m[1]; }
        if (!idMatch) return;
        var p = findProduct(idMatch);
        if (!p) return;
        var recs = bbPinkyComplements(p, 3);
        if (!recs.length) return;
        var div = document.createElement('div');
        div.className = 'detail-block bb-pinky-look';
        var cards = recs.map(function (q) {
            if (typeof bbRecCardHtml === 'function') return bbRecCardHtml(q, true);
            return '<div class="bb-rec-card"><strong>' + esc(titleOf(q)) + '</strong><span>' + money(priceOf(q)) + '</span></div>';
        }).join('');
        div.innerHTML = '<h4>💗 ' + esc(t('lookTitle')) + '</h4><p style="font-size:12.5px;color:#8a5a6b;margin:0 0 10px;">' + esc(t('lookSub')) + '</p><div class="bb-rec-row">' + cards + '</div>';
        content.appendChild(div);
    }
    /* On branche Complete Your Look sur la fiche produit existante, sans la toucher. */
    if (typeof bbOpenProduct === 'function' && !window.__bbPinkyLookWrapped) {
        window.__bbPinkyLookWrapped = true;
        var __bbOrigOpenProduct = bbOpenProduct;
        bbOpenProduct = function (id, noPush) {
            __bbOrigOpenProduct(id, noPush);
            setTimeout(bbPinkyAppendLook, 0);
        };
    }

    /* ==========================================================================
       4a. ABANDONED CART RECOVERY — rappel local, avec consentement.
       Aucun envoi automatique : le site est statique, il ne peut pas envoyer
       de courriel ni de WhatsApp tout seul. Si la cliente coche la case,
       Bella IA lui rappelle son panier à sa prochaine visite (une fois par jour),
       et Bella IA le lui rappelle automatiquement.
       ========================================================================== */
    var CART_CONSENT_KEY = 'bbPinkyCartConsent';
    var CART_REMIND_KEY = 'bbPinkyCartReminded';
    function bbCartCount() {
        try { return (typeof bbCart !== 'undefined' ? bbCart : JSON.parse(localStorage.getItem('bbCart') || '[]')).reduce(function (s, l) { return s + (l.qty || 1); }, 0); } catch (e) { return 0; }
    }
    function bbPinkyCartConsent() {
        try { return localStorage.getItem(CART_CONSENT_KEY) === '1'; } catch (e) { return false; }
    }
    window.bbPinkyCartConsentChange = function (el) {
        try { localStorage.setItem(CART_CONSENT_KEY, el.checked ? '1' : '0'); } catch (e) {}
        var note = document.getElementById('bbCartReminderNote');
        if (note) note.style.display = el.checked ? 'block' : 'none';
    };
    function bbCartToast() {
        if (!bbPinkyCartConsent()) return;
        var n = bbCartCount();
        if (n <= 0) return;
        try {
            var today = new Date().toISOString().slice(0, 10);
            if (localStorage.getItem(CART_REMIND_KEY) === today) return;
            localStorage.setItem(CART_REMIND_KEY, today);
        } catch (e) {}
        var toast = document.getElementById('bbCartToast');
        if (!toast) return;
        var txt = toast.querySelector('.bb-cart-toast-text');
        if (txt) txt.textContent = 'Bella IA vous rappelle : ' + t('cartToast') + ' ' + n + ' ' + t('cartToastEnd');
        toast.hidden = false;
    }
    window.bbCartToastClose = function () {
        var toast = document.getElementById('bbCartToast');
        if (toast) toast.hidden = true;
    };
    window.bbCartToastOpen = function () {
        window.bbCartToastClose();
        if (typeof toggleCart === 'function') toggleCart(true);
    };

    /* ==========================================================================
       4b. BEAUTY BOXES + TENDANCES — branchement des boutons (HTML statique
       dans les fragments, avec les vrais produits et les vrais prix).
       ========================================================================== */
    window.bbPinkyAddBox = function (ids) {
        if (typeof addToCart !== 'function') return;
        String(ids || '').split(',').forEach(function (id) {
            id = id.trim();
            if (id && findProduct(id)) addToCart(id);
        });
    };
    window.bbPinkyOpenProduct = function (id) {
        if (typeof bbOpenProduct === 'function') bbOpenProduct(id);
    };
    document.addEventListener('click', function (ev) {
        var el = ev.target && ev.target.closest ? ev.target.closest('[data-bb-box-add]') : null;
        if (el) { window.bbPinkyAddBox(el.getAttribute('data-bb-box-add')); return; }
        var op = ev.target && ev.target.closest ? ev.target.closest('[data-bb-open-product]') : null;
        if (op) { window.bbPinkyOpenProduct(op.getAttribute('data-bb-open-product')); }
    });

    /* Crochet de test (lecture seule, sans effet sur le site) : permet de
       verifier la logique Beauty Match hors navigateur. */
    window.__bbPinkyTest = { compute: bmCompute, score: bmScore };

    /* ==========================================================================
       INITIALISATION
       ========================================================================== */
    function bbPinkyInit() {
        /* Visuel Pinky dans la modale d'alerte securite (v5.1 : FAB, panneau et bulle retires de l'entree). */
        var warnAv = document.getElementById('bbPinkyWarnAvatar');
        if (warnAv && !warnAv.querySelector('svg')) warnAv.innerHTML = PINKY_SVG;

        /* Restaurer le consentement rappel panier. */
        var consent = document.getElementById('bbCartReminderConsent');
        if (consent) {
            consent.checked = bbPinkyCartConsent();
            var note = document.getElementById('bbCartReminderNote');
            if (note) note.style.display = consent.checked ? 'block' : 'none';
        }

        /* Verifier les liens de la page, puis les rappels. */
        bbPinkyScanLinks();
        setTimeout(bbCartToast, 2500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bbPinkyInit);
    else bbPinkyInit();
})();
