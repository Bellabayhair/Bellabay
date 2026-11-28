/* ============================================================================
   bella-commandes.js — Module de commandes traçables Bella Bay
   ----------------------------------------------------------------------------
   Module autonome (aucune dépendance) pour bellabay.ca (site statique).

   Problèmes corrigés (audit Rapport_Vendabilite_Site.md) :
   A. createOrder n'envoyait à PayPal QUE le montant total : aucun article.
      → bbBuildPayPalPayload() construit des purchase_units COMPLETS (items,
        ventilation des montants) qui retombent au centime près sur le total
        calculé par le site (cartSubtotal / cartDiscount / cartTotal).
   B. Aucun enregistrement de commande n'existait.
      → bbRecordOrder() construit l'enregistrement officiel (client, adresse,
        articles, variantes, montants, statut PayPal, instructions de
        préparation) et le persiste dans localStorage (clé bbOrdersV1) :
        il survit à la fermeture du navigateur sur l'appareil de la cliente.
   C. Aucune confirmation détaillée pour la cliente.
      → bbRenderConfirmation() produit le récapitulatif HTML (échappé).
   D. Aucune transmission structurée de la commande à Bella Bay.
      → bbOrderHandoffLinks() génère des liens WhatsApp et courriel
        PRÉ-REMPLIS avec le détail complet. Le module n'envoie RIEN tout
        seul : la cliente touche le lien. (Site statique = aucun envoi
        automatique possible côté boutique; le reçu PayPal officiel +
        cette transmission en un toucher couvrent le besoin.)
   E. Le panier cadeau personnalisé se perdait au rechargement
      (bbCustomProducts seulement en mémoire).
      → bbSaveCustomProducts() / bbLoadCustomProducts() persistent le
        registre des produits personnalisés dans localStorage
        (clé bbCustomProductsV1).

   TAXES : aucune taxe n'est ajoutée. Le champ tax_total est présent à 0,00
   dans la ventilation PayPal, comme EMPLACEMENT documenté : la question
   TPS/TVQ est une décision commerciale de Bella, pas un choix du module.
   L'enregistrement porte le champ « taxesApplicables » à 0, marqué
   « en attente de décision de Bella (TPS/TVQ) » — jamais inventé.

   VÉRIFICATION : chaque enregistrement est comparé aux détails réellement
   capturés par PayPal (montant, devise, statut, identifiants) et porte un
   champ « verification » (concordant / écart + détail). La fonction
   bbVerifyOrder() permet de refaire ce contrôle à tout moment.

   PROTECTION DES DONNÉES : le module ne lit ni ne conserve AUCUNE donnée
   bancaire ou de carte — PayPal traite le paiement, le site n'y touche
   jamais. Seuls les champs nécessaires à la préparation et à l'expédition
   sont conservés : nom, courriel, adresse de livraison, articles, montants,
   statut. Rien d'autre n'est extrait de la capture PayPal.

   Branchements dans index.html : voir Journal_Module_Commandes.md.
   ============================================================================ */
(function (global) {
    'use strict';

    var ORDERS_KEY = 'bbOrdersV1';
    var CUSTOM_KEY = 'bbCustomProductsV1';
    var CURRENCY = 'CAD';
    var WHATSAPP_NUMBER = '15145822856';           /* WhatsApp public Bella Bay */
    var ORDER_EMAIL = 'bellabay.coiffure@gmail.com';

    /* ---------- Utilitaires monétaires (entiers en cents = exactitude) ---- */
    function toCents(n) { return Math.round(Number(n) * 100); }
    function fromCents(c) { return c / 100; }
    function fmtPayPal(cents) { return (cents / 100).toFixed(2); }        /* "31.49" */
    function fmtFR(cents) {                                                 /* "31,49 $" */
        return (cents / 100).toFixed(2).replace('.', ',') + ' $';
    }
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function warn(opts, msg) {
        if (opts && typeof opts.onWarning === 'function') { opts.onWarning(msg); }
        if (typeof console !== 'undefined' && console.warn) { console.warn('[bella-commandes] ' + msg); }
    }
    function storage(opts) {
        if (opts && opts.storage) return opts.storage;
        try { return (typeof localStorage !== 'undefined') ? localStorage : null; }
        catch (e) { return null; }
    }

    /* ---------- Résolution des produits ------------------------------------
       Le panier du site est un tableau de {id, qty}. La résolution suit la
       même chaîne que bbFindProduct du site : fonction fournie en option,
       sinon bbFindProduct global, sinon catalogue passé en option.          */
    function resolver(opts) {
        opts = opts || {};
        if (typeof opts.findProduct === 'function') return opts.findProduct;
        if (typeof global.bbFindProduct === 'function') return global.bbFindProduct;
        if (opts.products) {
            var cat = opts.products;
            return function (id) {
                if (Array.isArray(cat)) {
                    for (var i = 0; i < cat.length; i++) { if (cat[i].id === id) return cat[i]; }
                    return null;
                }
                return cat[id] || null;
            };
        }
        return function () { return null; };
    }
    function resolveLines(cart, opts) {
        var find = resolver(opts);
        var lines = [], unresolved = [];
        (cart || []).forEach(function (l) {
            var p = find(l.id);
            if (!p) { unresolved.push(l.id); return; }
            lines.push({ id: l.id, qty: Math.max(1, parseInt(l.qty, 10) || 1), product: p });
        });
        return { lines: lines, unresolved: unresolved };
    }

    /* ---------- Totaux : réplique exacte de la logique du site -------------
       Site : cartSubtotal() = Σ priceCAD × qty (flottant)
              cartDiscount() = bbPromo === 'BELLA' ? sous-total × 0,10 : 0
              cartTotal()    = sous-total − rabais ; livraison 0 ; taxe 0.
       On calcule en cents pour la ventilation, et on réconcilie avec le
       total flottant du site (ou opts.expectedTotal = cartTotal() réel) :
       en cas d'écart d'arrondi d'un cent, c'est la ligne « rabais » qui
       absorbe la différence — la ventilation tombe alors TOUJOURS juste.   */
    function computeTotals(lines, opts) {
        opts = opts || {};
        var promo = (opts.promo != null ? opts.promo : (opts.promoCode || '')).toString().toUpperCase() === 'BELLA';
        var itemTotalCents = 0, subtotalFloat = 0;
        lines.forEach(function (l) {
            itemTotalCents += toCents(l.product.priceCAD) * l.qty;
            subtotalFloat += l.product.priceCAD * l.qty;
        });
        var discountFloat = promo ? subtotalFloat * 0.10 : 0;
        var siteTotalStr = (typeof opts.expectedTotal === 'number')
            ? opts.expectedTotal.toFixed(2)
            : (subtotalFloat - discountFloat).toFixed(2);
        var targetCents = toCents(parseFloat(siteTotalStr));
        var discountCents = 0;
        if (promo && itemTotalCents > 0) {
            discountCents = itemTotalCents - targetCents;   /* réconciliation exacte */
            if (discountCents < 0) {                        /* garde-fou théorique */
                discountCents = Math.round(itemTotalCents * 0.10);
                targetCents = itemTotalCents - discountCents;
            }
        } else {
            targetCents = itemTotalCents;                   /* sans promo : somme exacte en cents */
        }
        return {
            promo: promo,
            itemTotalCents: itemTotalCents,
            discountCents: discountCents,
            shippingCents: 0,                               /* livraison gratuite affichée */
            taxCents: 0,                                    /* emplacement TPS/TVQ : décision de Bella */
            totalCents: targetCents
        };
    }

    /* ---------- Variante / longueur extraite du titre -----------------------
       Conservateur : n'extrait que ce qui est écrit dans le titre
       (longueur en pouces ou cm, format de lace 13x4 / 5x5…). N'invente rien. */
    function bbExtractVariant(title) {
        var t = String(title || '');
        var parts = [];
        var m = t.match(/(\d{1,2})\s*(pouces|po\b|inches|in\b|")/i);
        if (m) { parts.push('Longueur ' + m[1] + ' po'); }
        else {
            var mc = t.match(/(\d{2,3})\s*cm\b/i);
            if (mc) { parts.push('Longueur ' + mc[1] + ' cm'); }
        }
        var lace = t.match(/\b(13x4|13x6|13x7|4x4|5x5|6x6|7x7|2x6)\b/);
        if (lace) { parts.push('Lace ' + lace[1]); }
        var size = t.match(/Panier cadeau personnalisé[^\n]*—\s*(Petit|Moyen|Grand)/i);
        if (size) { parts.push('Boîte ' + size[1].toLowerCase()); }
        return parts.join(' · ');
    }

    /* ======================================================================
       1. bbBuildPayPalPayload(cart, opts)
       Construit l'objet complet à passer à actions.order.create().
       opts : { findProduct | products, promo | promoCode ('BELLA'),
                expectedTotal (cartTotal() du site), referral (custom_id),
                onWarning }
       ====================================================================== */
    function bbBuildPayPalPayload(cart, opts) {
        opts = opts || {};
        var res = resolveLines(cart, opts);
        if (res.unresolved.length) {
            warn(opts, 'Produits introuvables exclus de la commande PayPal : ' + res.unresolved.join(', '));
        }
        var totals = computeTotals(res.lines, opts);
        var items = res.lines.map(function (l) {
            return {
                name: String(l.product.title || l.id).slice(0, 127),
                sku: String(l.id).slice(0, 127),
                quantity: String(l.qty),
                unit_amount: { currency_code: CURRENCY, value: fmtPayPal(toCents(l.product.priceCAD)) },
                category: 'PHYSICAL_GOODS'
            };
        });
        var breakdown = {
            item_total: { currency_code: CURRENCY, value: fmtPayPal(totals.itemTotalCents) },
            shipping: { currency_code: CURRENCY, value: fmtPayPal(totals.shippingCents) },
            tax_total: { currency_code: CURRENCY, value: fmtPayPal(totals.taxCents) }
        };
        if (totals.promo && totals.discountCents > 0) {
            breakdown.discount = { currency_code: CURRENCY, value: fmtPayPal(totals.discountCents) };
        }
        var unit = {
            description: 'Commande bellabay.ca',
            amount: {
                currency_code: CURRENCY,
                value: fmtPayPal(totals.totalCents),
                breakdown: breakdown
            },
            items: items
        };
        if (opts.referral) { unit.custom_id = String(opts.referral).slice(0, 127); }
        return { purchase_units: [unit] };
    }

    /* ---------- Vérification de concordance avec la capture PayPal ---------
       Compare l'enregistrement (totaux recalculés du panier) avec ce que
       PayPal a RÉELLEMENT capturé : montant, devise, statut, identifiants.
       Tout écart est signalé, jamais masqué.                              */
    function computeVerification(order, captureDetails, totals) {
        var details = captureDetails || {};
        var pu = (details.purchase_units && details.purchase_units[0]) || {};
        var capture = (pu.payments && pu.payments.captures && pu.payments.captures[0]) || {};
        var ecarts = [];
        var montantCaptureCents = null;
        if (pu.amount && pu.amount.value != null && !isNaN(Number(pu.amount.value))) {
            montantCaptureCents = toCents(Number(pu.amount.value));
            if (montantCaptureCents !== totals.totalCents) {
                ecarts.push('Montant capturé par PayPal (' + fmtFR(montantCaptureCents) + ' CAD)'
                    + ' ≠ total du panier calculé (' + fmtFR(totals.totalCents) + ' CAD)');
            }
        } else {
            ecarts.push('Montant capturé absent des détails PayPal');
        }
        var deviseCapture = (pu.amount && pu.amount.currency_code) || '';
        if (deviseCapture !== CURRENCY) {
            ecarts.push('Devise capturée « ' + (deviseCapture || 'absente') + ' » ≠ ' + CURRENCY);
        }
        var statutCapture = capture.status || details.status || '';
        if (!statutCapture) {
            ecarts.push('Statut PayPal absent des détails de capture');
        } else if (statutCapture !== 'COMPLETED') {
            ecarts.push('Statut PayPal « ' + statutCapture + ' » ≠ COMPLETED');
        }
        if (!details.id) { ecarts.push('Identifiant de commande PayPal absent'); }
        if (!capture.id) { ecarts.push('Identifiant de capture PayPal absent'); }
        return {
            statut: ecarts.length ? 'écart' : 'concordant',
            ecarts: ecarts,
            verifieLe: new Date().toISOString(),
            montantCapture: montantCaptureCents != null ? fromCents(montantCaptureCents) : null,
            deviseCapture: deviseCapture || null,
            statutCapture: statutCapture || null,
            captureId: capture.id || null
        };
    }

    /* bbVerifyOrder(order, captureDetails, opts)
       Refait le contrôle de concordance sur un enregistrement existant.
       Retourne l'objet verification. Avec opts.persist = true, met aussi à
       jour le champ verification de l'enregistrement persisté. */
    function bbVerifyOrder(order, captureDetails, opts) {
        opts = opts || {};
        if (!order) return null;
        var totals = {
            totalCents: toCents(order.totalPanierCalcule != null ? order.totalPanierCalcule : order.total)
        };
        var verification = computeVerification(order, captureDetails, totals);
        order.verification = verification;
        if (opts.persist) {
            var store = storage(opts);
            if (store) {
                try {
                    var all = bbGetOrders(opts);
                    for (var i = 0; i < all.length; i++) {
                        if (all[i].orderId === order.orderId) { all[i].verification = verification; break; }
                    }
                    store.setItem(ORDERS_KEY, JSON.stringify(all));
                } catch (e) { warn(opts, 'Mise à jour de la vérification non persistée : ' + e.message); }
            }
        }
        return verification;
    }

    /* ======================================================================
       2. bbRecordOrder(captureDetails, cart, opts)
       Construit l'enregistrement officiel de commande à partir du résultat
       de capture PayPal (details de actions.order.capture()) et du panier
       (à appeler AVANT de vider le panier), puis le persiste (bbOrdersV1).
       Retourne l'enregistrement.
       ====================================================================== */
    function bbRecordOrder(captureDetails, cart, opts) {
        opts = opts || {};
        var details = captureDetails || {};
        var pu = (details.purchase_units && details.purchase_units[0]) || {};
        var capture = (pu.payments && pu.payments.captures && pu.payments.captures[0]) || {};
        var payer = details.payer || {};
        var payerName = payer.name || {};
        var ship = pu.shipping || {};
        var shipAddr = ship.address || {};

        var res = resolveLines(cart, opts);
        if (res.unresolved.length) {
            warn(opts, 'Lignes de panier introuvables à l’enregistrement : ' + res.unresolved.join(', '));
        }
        var totals = computeTotals(res.lines, opts);

        var articles = res.lines.map(function (l) {
            var unitCents = toCents(l.product.priceCAD);
            return {
                id: l.id,
                titre: String(l.product.title || l.id),
                variante: bbExtractVariant(l.product.title),
                quantite: l.qty,
                prixUnitaire: fromCents(unitCents),
                totalLigne: fromCents(unitCents * l.qty)
            };
        });

        var instructions = res.lines.map(function (l) {
            var p = l.product;
            var titre = String(p.title || l.id);
            var v = bbExtractVariant(titre);
            var note;
            if (String(l.id).indexOf('bb-custom-gift-') === 0 || /panier cadeau/i.test(titre)) {
                note = 'Contenu : ' + (p.desc || titre) + ' Emballage cadeau Bella Bay.';
            } else if (/pouces|closure|frontal|perruque|extension/i.test(titre)) {
                note = 'Vérifier longueur et teinte contre la fiche avant envoi; emballage Bella Bay.';
            } else {
                note = 'Vérifier l’état de l’article avant envoi; emballage Bella Bay.';
            }
            return l.qty + ' × ' + titre + (v ? ' (' + v + ')' : '') + ' — ' + note;
        });

        var nomClient = [payerName.given_name, payerName.surname].filter(Boolean).join(' ')
            || (ship.name && ship.name.full_name) || '';
        var adresseComplete = [
            shipAddr.address_line_1, shipAddr.address_line_2,
            shipAddr.admin_area_2, shipAddr.admin_area_1,
            shipAddr.postal_code, shipAddr.country_code
        ].filter(Boolean).join(', ');

        var paidValue = pu.amount && pu.amount.value != null ? Number(pu.amount.value) : null;
        var totalPayeCents = paidValue != null && !isNaN(paidValue) ? toCents(paidValue) : totals.totalCents;

        var order = {
            orderId: details.id || ('BB-SANS-ID-' + Date.now()),
            orderIdGenere: !details.id,
            captureId: capture.id || '',
            date: (opts.now ? new Date(opts.now) : new Date()).toISOString(),
            source: 'bellabay.ca',
            client: {
                nom: nomClient,
                courriel: payer.email_address || '',
                idPayPal: payer.payer_id || ''
            },
            adresseLivraison: {
                nom: (ship.name && ship.name.full_name) || nomClient,
                ligne1: shipAddr.address_line_1 || '',
                ligne2: shipAddr.address_line_2 || '',
                ville: shipAddr.admin_area_2 || '',
                province: shipAddr.admin_area_1 || '',
                codePostal: shipAddr.postal_code || '',
                pays: shipAddr.country_code || '',
                complete: adresseComplete
            },
            articles: articles,
            lignesNonResolues: res.unresolved,
            sousTotal: fromCents(totals.itemTotalCents),
            rabais: fromCents(totals.discountCents),
            codePromo: totals.promo ? 'BELLA' : '',
            livraison: fromCents(totals.shippingCents),
            taxe: fromCents(totals.taxCents),
            taxesApplicables: { montant: 0, statut: 'en attente de décision de Bella (TPS/TVQ)' },
            total: fromCents(totalPayeCents),
            totalPanierCalcule: fromCents(totals.totalCents),
            ecartMontant: totalPayeCents !== totals.totalCents,
            devise: (pu.amount && pu.amount.currency_code) || CURRENCY,
            statutPayPal: capture.status || details.status || 'INCONNU',
            modePaiement: 'PayPal',
            instructionsPreparation: instructions,
            parrainage: opts.referral || '',
            verification: null,
            persistance: ''
        };
        order.verification = computeVerification(order, details, totals);

        /* Persistance locale : survit à la fermeture du navigateur
           (sur l'appareil de la cliente — voir limites dans le journal). */
        var store = storage(opts);
        if (store) {
            try {
                var existing = [];
                try { existing = JSON.parse(store.getItem(ORDERS_KEY) || '[]'); } catch (e) { existing = []; }
                if (!Array.isArray(existing)) existing = [];
                var idx = -1;
                for (var i = 0; i < existing.length; i++) {
                    if (existing[i] && existing[i].orderId === order.orderId) { idx = i; break; }
                }
                if (idx >= 0) { existing[idx] = order; } else { existing.push(order); }
                store.setItem(ORDERS_KEY, JSON.stringify(existing));
                order.persistance = 'localStorage (' + ORDERS_KEY + ')';
            } catch (e) {
                order.persistance = 'échec d’écriture localStorage';
                warn(opts, 'Enregistrement de la commande non persisté : ' + e.message);
            }
        } else {
            order.persistance = 'localStorage indisponible';
        }
        return order;
    }

    function bbGetOrders(opts) {
        var store = storage(opts || {});
        if (!store) return [];
        try {
            var arr = JSON.parse(store.getItem(ORDERS_KEY) || '[]');
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }
    function bbGetOrder(orderId, opts) {
        var all = bbGetOrders(opts);
        for (var i = 0; i < all.length; i++) { if (all[i].orderId === orderId) return all[i]; }
        return null;
    }

    /* ---------- Texte complet de la commande (liens de transmission) ------ */
    function bbOrderText(order) {
        var L = [];
        L.push('NOUVELLE COMMANDE BELLA BAY — ' + order.orderId);
        L.push('Date : ' + order.date);
        L.push('Statut PayPal : ' + order.statutPayPal);
        L.push('Client : ' + (order.client.nom || '—') + (order.client.courriel ? ' <' + order.client.courriel + '>' : ''));
        L.push('Livraison : ' + (order.adresseLivraison.complete || '—'));
        L.push('');
        L.push('ARTICLES :');
        order.articles.forEach(function (a) {
            L.push('• ' + a.quantite + ' × ' + a.titre + (a.variante ? ' (' + a.variante + ')' : '')
                + ' — ' + a.quantite + ' × ' + fmtFR(toCents(a.prixUnitaire)) + ' = ' + fmtFR(toCents(a.totalLigne)));
        });
        L.push('');
        L.push('Sous-total : ' + fmtFR(toCents(order.sousTotal)) + ' CAD');
        if (order.rabais > 0) { L.push('Rabais' + (order.codePromo ? ' (' + order.codePromo + ' -10 %)' : '') + ' : −' + fmtFR(toCents(order.rabais)) + ' CAD'); }
        L.push('Livraison : Gratuite');
        if (order.taxe > 0) { L.push('Taxes : ' + fmtFR(toCents(order.taxe)) + ' CAD'); }
        L.push('TOTAL PAYÉ : ' + fmtFR(toCents(order.total)) + ' ' + order.devise);
        L.push('');
        L.push('PRÉPARATION :');
        order.instructionsPreparation.forEach(function (s) { L.push('- ' + s); });
        if (order.parrainage) { L.push(''); L.push('Parrainage : ' + order.parrainage); }
        return L.join('\n');
    }

    /* ======================================================================
       4. bbOrderHandoffLinks(order)
       Liens de transmission à Bella Bay. Le module ne fait QUE produire
       les liens : aucun envoi automatique.
       ====================================================================== */
    function bbOrderHandoffLinks(order) {
        var texte = bbOrderText(order);
        return {
            whatsapp: 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(texte),
            courriel: 'mailto:' + ORDER_EMAIL
                + '?subject=' + encodeURIComponent('Commande Bella Bay ' + order.orderId)
                + '&body=' + encodeURIComponent(texte),
            texte: texte
        };
    }

    /* ======================================================================
       3. bbRenderConfirmation(order)
       Récapitulatif affichable à la cliente (HTML échappé), avec les
       boutons de transmission en un toucher vers Bella Bay.
       ====================================================================== */
    function bbRenderConfirmation(order) {
        var links = bbOrderHandoffLinks(order);
        var rows = order.articles.map(function (a) {
            return '<tr>'
                + '<td style="padding:6px 8px;text-align:left;">' + escapeHtml(a.titre)
                + (a.variante ? '<br><span style="color:#766d70;font-size:12px;">' + escapeHtml(a.variante) + '</span>' : '') + '</td>'
                + '<td style="padding:6px 8px;text-align:center;">' + a.quantite + '</td>'
                + '<td style="padding:6px 8px;text-align:right;">' + escapeHtml(fmtFR(toCents(a.totalLigne))) + '</td>'
                + '</tr>';
        }).join('');
        var rabaisRow = order.rabais > 0
            ? '<p style="margin:2px 0;font-size:14px;color:#5b2333;">Rabais' + (order.codePromo ? ' (' + escapeHtml(order.codePromo) + ' −10 %)' : '') + ' : −' + escapeHtml(fmtFR(toCents(order.rabais))) + '</p>'
            : '';
        return '<div style="background:linear-gradient(135deg,#fdf2f5,#fffaf0);border:1.5px solid #c9a45c;border-radius:14px;padding:20px 16px;margin-top:14px;color:#5b2333;">'
            + '<div style="font-size:34px;line-height:1;text-align:center;">\uD83D\uDC1A\u2728</div>'
            + '<h3 style="font-family:\'Cormorant Garamond\',serif;font-size:24px;margin:8px 0 4px;text-align:center;">Merci ! Votre commande est confirmée.</h3>'
            + '<p style="font-size:14px;line-height:1.6;margin:0 0 4px;text-align:center;">Commande PayPal : <strong>' + escapeHtml(order.orderId) + '</strong> · Statut : ' + escapeHtml(order.statutPayPal) + '</p>'
            + '<p style="font-size:13px;line-height:1.6;margin:0 0 12px;text-align:center;color:#766d70;">Un reçu officiel PayPal vous est envoyé par courriel par PayPal. Conservez ce numéro de commande.</p>'
            + '<table style="width:100%;border-collapse:collapse;font-size:14px;background:#ffffff;border:1px solid #ead9c2;border-radius:10px;overflow:hidden;">'
            + '<thead><tr style="background:#fdf2f5;"><th style="padding:6px 8px;text-align:left;">Article</th><th style="padding:6px 8px;">Qté</th><th style="padding:6px 8px;text-align:right;">Total</th></tr></thead>'
            + '<tbody>' + rows + '</tbody></table>'
            + '<div style="margin-top:10px;">'
            + '<p style="margin:2px 0;font-size:14px;">Sous-total : ' + escapeHtml(fmtFR(toCents(order.sousTotal))) + '</p>'
            + rabaisRow
            + '<p style="margin:2px 0;font-size:14px;">Livraison : Gratuite</p>'
            + '<p style="margin:2px 0;font-size:16px;"><strong>Total payé : ' + escapeHtml(fmtFR(toCents(order.total))) + ' ' + escapeHtml(order.devise) + '</strong></p>'
            + '</div>'
            + (order.adresseLivraison.complete
                ? '<p style="font-size:13px;line-height:1.6;margin:10px 0 0;">Livraison à : ' + escapeHtml(order.adresseLivraison.complete) + '</p>' : '')
            + '<p style="font-size:13px;line-height:1.7;margin:12px 0 6px;"><strong>Prochaines étapes :</strong><br>'
            + '1. Transmettez votre commande à Bella Bay en un toucher (bouton ci-dessous) pour déclencher sa préparation.<br>'
            + '2. Bella Bay confirme la préparation et l’expédition sur WhatsApp.<br>'
            + '3. Suivi et questions : WhatsApp 514-582-2856.</p>'
            + '<p style="margin:10px 0 0;display:flex;gap:10px;flex-wrap:wrap;">'
            + '<a href="' + escapeHtml(links.whatsapp) + '" target="_blank" rel="noopener" style="display:inline-block;background:#25D366;color:#ffffff;padding:11px 18px;border-radius:30px;text-decoration:none;font-weight:700;font-size:14px;">Transmettre ma commande sur WhatsApp</a>'
            + '<a href="' + escapeHtml(links.courriel) + '" style="display:inline-block;background:#241a1f;color:#f5d98b;padding:11px 18px;border-radius:30px;text-decoration:none;font-weight:700;font-size:14px;">Transmettre par courriel</a>'
            + '</p>'
            + '</div>';
    }

    /* ======================================================================
       5. Correctif panier cadeau — persistance de bbCustomProducts
       Le site garde les produits personnalisés dans l'objet en mémoire
       bbCustomProducts : au rechargement, les lignes du panier sauvegardé
       deviennent introuvables. Ces fonctions persistent le registre dans
       localStorage (bbCustomProductsV1) et le réhydratent au démarrage.
       Branchement : voir Journal_Module_Commandes.md.
       ====================================================================== */
    function bbSaveCustomProducts(registry, opts) {
        var reg = registry || (typeof global.bbCustomProducts !== 'undefined' ? global.bbCustomProducts : null);
        var store = storage(opts || {});
        if (!reg || !store) return false;
        try { store.setItem(CUSTOM_KEY, JSON.stringify(reg)); return true; }
        catch (e) { warn(opts || {}, 'Sauvegarde des produits personnalisés échouée : ' + e.message); return false; }
    }
    function bbLoadCustomProducts(registry, opts) {
        var reg = registry || (typeof global.bbCustomProducts !== 'undefined' ? global.bbCustomProducts : null);
        var store = storage(opts || {});
        if (!reg || !store) return 0;
        try {
            var saved = JSON.parse(store.getItem(CUSTOM_KEY) || '{}');
            var n = 0;
            Object.keys(saved || {}).forEach(function (k) {
                if (!reg[k]) { reg[k] = saved[k]; n++; }
            });
            return n;
        } catch (e) { return 0; }
    }
    function bbPersistGiftProduct(product, registry, opts) {
        var reg = registry || (typeof global.bbCustomProducts !== 'undefined' ? global.bbCustomProducts : null);
        if (!reg || !product || !product.id) return false;
        reg[product.id] = product;
        return bbSaveCustomProducts(reg, opts || {});
    }

    /* ---------- API publique ------------------------------------------------ */
    var api = {
        bbBuildPayPalPayload: bbBuildPayPalPayload,
        bbRecordOrder: bbRecordOrder,
        bbVerifyOrder: bbVerifyOrder,
        bbRenderConfirmation: bbRenderConfirmation,
        bbOrderHandoffLinks: bbOrderHandoffLinks,
        bbOrderText: bbOrderText,
        bbGetOrders: bbGetOrders,
        bbGetOrder: bbGetOrder,
        bbExtractVariant: bbExtractVariant,
        bbSaveCustomProducts: bbSaveCustomProducts,
        bbLoadCustomProducts: bbLoadCustomProducts,
        bbPersistGiftProduct: bbPersistGiftProduct,
        ORDERS_KEY: ORDERS_KEY,
        CUSTOM_KEY: CUSTOM_KEY
    };
    Object.keys(api).forEach(function (k) { global[k] = api[k]; });
    global.BellaCommandes = api;

    /* Réhydratation automatique si le registre existe déjà au chargement
       (script placé après le code du panier). Sans effet sinon. */
    try {
        if (typeof global.bbCustomProducts !== 'undefined') { bbLoadCustomProducts(); }
    } catch (e) { /* silencieux : le branchement manuel reste possible */ }

    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
