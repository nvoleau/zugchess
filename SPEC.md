# Cahier des charges — ZugChess

Version du 6 octobre 2026 · Nicolas Voleau

## Contexte et objectifs

ZugChess (de « zugzwang », l'obligation de jouer qui décide tant de finales) est une application web pour apprendre, comprendre et jouer toutes les finales d'échecs, construite sur le modèle d'OpenChess (openchess.app). Le joueur comprend d'abord le plan grâce à des leçons, puis l'applique sur des positions jugées par un juge exact (tables de finales de Lichess) ou par Stockfish au-delà de 7 pièces. Le tempo reste un fil conducteur, mais toutes les familles de finales sont couvertes : pions, tours, dames, pièces mineures, mats élémentaires et finales mixtes.

Un prototype mono-page existe déjà (12 positions, table roi + pion contre roi calculée dans le navigateur, FSRS). Ce cahier des charges décrit l'application complète à faire construire par Claude Code.

Objectifs mesurables à 6 mois après lancement :

- 500 joueurs inscrits, dont 30 % actifs chaque semaine.
- Une séance quotidienne médiane de 5 à 10 minutes.
- Un taux de rétention à J30 de 25 % ou plus.
- Une bibliothèque de 300 positions validées, couvrant les 7 familles de finales.

Public visé : joueurs de 600 à 1800 Elo sur Lichess ou Chess.com, francophones en priorité, interface prévue pour l'anglais dès le départ.

## Périmètre

Le MVP couvre l'entraînement complet, la répétition espacée, les comptes et la gamification de base. Les fonctions sociales avancées viennent ensuite.

| Fonction | MVP | Version 2 |
| --- | --- | --- |
| Comptes (e-mail, connexion Lichess) | Oui | Connexion Chess.com |
| Leçons interactives par thème | Oui |  |
| Bibliothèque de 300 positions, toutes familles de finales | Oui | 1 000 positions, contributions de la communauté |
| Annonce du résultat puis jeu contre le juge | Oui |  |
| Juge exact par tables Syzygy via l'API Lichess (7 pièces max) | Oui |  |
| Juge Stockfish WASM (plus de 7 pièces) | Oui |  |
| Jeu libre depuis n'importe quelle position (FEN) | Oui, premium |  |
| Lignes de méthode (Lucena, Philidor…) | Oui |  |
| Révision FSRS et séance quotidienne | Oui |  |
| XP, niveaux, séries, trophées, rappels de série par e-mail | Oui |  |
| Classement global et hebdomadaire | Oui | Classement par club |
| Quotas gratuits et droits premium | Oui, actifs dès le lancement | Paiement Stripe |
| Ligues hebdomadaires | Non | Oui |
| Import des finales de ses propres parties Lichess | Non | Oui, premium |
| Application mobile native | Non | PWA d'abord, natif ensuite |

Hors périmètre : jeu en ligne entre joueurs, analyse de parties complètes, ouvertures et milieu de jeu.

## Modèle économique

L'application est gratuite au lancement, puis passe en freemium dès que possible. Pour ne pas donner trop en gratuit, les quotas et la séparation gratuit / premium sont codés dès le premier lot, même pendant la phase gratuite : les joueurs ne s'habituent jamais à un accès illimité.

| Fonction | Gratuit | Premium |
| --- | --- | --- |
| Positions accessibles | Parcours « Fondamentaux » (environ 40 positions : mats élémentaires, bases des finales de pions) | Les 300 positions et toutes les nouvelles |
| Nouvelles positions par jour | 3 | Illimité (réglable) |
| Révisions FSRS par jour | 20 | Illimité |
| Leçons | Première leçon de chaque famille | Toutes |
| Jeu libre depuis une FEN | Non | Oui |
| Explication d'une erreur (coup gagnant + plan) | 3 par jour | Illimité |
| Statistiques | Série, XP, Elo | Maîtrise par thème, historique, points faibles |
| Classements et trophées | Oui | Oui, plus ligues en version 2 |
| Import de ses parties | Non | Oui (version 2) |

La grille reprend celle d'OpenChess : une offre gratuite et une offre Premium, payable au mois ou à l'année. La page Tarifs affiche un sélecteur Mensuel / Annuel, avec l'économie annuelle mise en avant.

| Offre | Prix | Équivalent mensuel |
| --- | --- | --- |
| Gratuit | 0 € | 0 € |
| Premium mensuel | 6,99 € par mois | 6,99 € |
| Premium annuel | 59 € par an (environ −30 %) | 4,92 € |
| Tarif fondateur | −40 % à vie : 4,19 € par mois ou 35,40 € par an | 4,19 € ou 2,95 € |

Conditions, alignées sur OpenChess :

- Paiement via Stripe (Checkout, Billing et portail client pour changer de formule ou résilier). Stripe Tax calcule la TVA européenne et Stripe émet les factures ; l'inscription au guichet unique de TVA (OSS) est à voir avec l'expert-comptable.
- Remboursement intégral sur simple demande dans les 14 jours suivant le premier paiement ou chaque renouvellement, tarif fondateur compris ; aucun remboursement partiel au-delà.
- Résiliation à tout moment : l'accès Premium reste ouvert jusqu'à la fin de la période payée.

Pendant la phase gratuite, les quotas s'appliquent déjà. Les 100 premiers inscrits et les membres du Cercle d'échecs spicéen obtiennent le statut « membre fondateur » : Premium offert 3 mois, puis tarif fondateur. Tous les contrôles de droits se font côté serveur, via un service unique `EntitlementService`.

## Utilisateurs et parcours

Trois rôles : visiteur, joueur inscrit, administrateur de contenu.

- **Visiteur** : essaie 3 positions sans compte. Sa progression est gardée en local et rattachée à son compte s'il s'inscrit.
- **Joueur** : suit sa séance quotidienne, parcourt la bibliothèque, consulte son profil, ses trophées et le classement.
- **Administrateur** : crée, valide et publie les positions et les lignes de méthode.

Parcours principaux du joueur :

1. Première visite : page d'accueil avec une position jouable immédiatement, puis invitation à créer un compte.
2. Inscription : choix de son niveau estimé (ou import de l'Elo Lichess), qui fixe la difficulté des premières positions.
3. Séance quotidienne : d'abord les cartes dues, puis de nouvelles positions dans la limite fixée (10 par jour par défaut, 3 en gratuit). Bilan en fin de séance : XP gagnés, série, cartes revues, prochaine échéance.
4. Entraînement libre : choix d'un thème (opposition, règle du carré, Lucena…), positions jouées sans limite (dans les quotas de l'offre).
5. Profil : Elo de finales, maîtrise par thème, calendrier d'activité, trophées.
6. Classement : global, hebdomadaire, puis par club en version 2.

## Fonctionnalités d'entraînement

Chaque position se joue en deux temps : l'annonce du résultat, puis la preuve sur l'échiquier. C'est le cœur du produit et il doit être identique dans tous les modes.

### Modes d'entraînement

- **Leçons** : pour comprendre. Chaque thème s'ouvre sur une leçon courte (5 à 8 écrans) : l'idée clé, les positions types, les flèches et cases surlignées, un mini-exercice par écran. Les leçons sont rédigées en Markdown avec des diagrammes et des coups intégrés.
- **Positions** : pour mémoriser et appliquer, avec annonce du résultat puis preuve contre le juge, et révision FSRS.
- **Jeu libre (premium)** : coller une FEN ou choisir une famille de finale, puis jouer la position jusqu'au bout contre le juge, avec explication des erreurs.
- **Explication d'erreur** : après un coup perdant, l'application montre le coup juste, la suite principale (5 coups) et rappelle le principe en jeu (opposition, Lucena, pont…), tiré du thème de la position.

### Bibliothèque de positions

Une position porte : FEN, camp du joueur, résultat attendu (gain blanc, nulle, gain noir), type de juge, thème, difficulté (Elo de la position), consigne courte, texte d'introduction, texte de conclusion.

Thèmes de départ :

- Mats élémentaires : dame, tour, deux fous, fou et cavalier.
- Finales de pions : opposition, cases clés, règle du carré, tempo et triangulation, pion de tour, majorités, pion passé éloigné, percée, courses de pions.
- Finales de tours : Lucena, Philidor, défense frontale, Vancura, roi coupé, tour derrière le pion passé, tour et deux pions contre tour.
- Finales de dame : dame contre pion en 7e, dame contre tour, dame et pion contre dame.
- Pièces mineures : fou contre pions, cavalier contre pions, fou contre cavalier, fous de couleurs opposées, mauvais fou, fou et pion contre fou.
- Tour contre pièce mineure : tour contre fou, tour contre cavalier, tour et fou contre tour.
- Études célèbres : Réti, Saavedra, et autres classiques.

### Déroulé d'une position

1. Annonce : « Trait aux X. Résultat avec le meilleur jeu ? » avec trois choix.
2. Jeu : le joueur joue son camp, le juge répond pour l'autre camp.
3. Coup perdant : le coup est annulé, les coups corrects sont signalés sur l'échiquier, la carte est notée en échec, le joueur continue.
4. Coup qui gagne encore mais plus lentement : il est accepté, la barre de tempo marque les temps perdus et indique le coup le plus direct.
5. Fin : gain (promotion sûre ou mat), nulle tenue pendant N coups (8 par défaut), ou fin de ligne de méthode. Le bilan s'affiche avec la prochaine révision.

### Barre de tempo

C'est l'élément distinctif de l'interface. En attaque, elle affiche « Dame dans N coups » (ou « Mat dans N ») avec une case par coup restant ; chaque temps perdu ajoute une case rouge. En défense, elle compte les coups tenus. Dans une ligne de méthode, elle montre l'avancement dans la méthode.

### Types de juge

| Juge | Positions concernées | Fonctionnement |
| --- | --- | --- |
| Table locale KPK | Roi + pion contre roi | Calculée dans le navigateur au chargement (environ 0,5 s), aucun appel réseau |
| Tables Syzygy | Jusqu'à 7 pièces | Appel au serveur de l'application, qui interroge l'API tablebase de Lichess et met les résultats en cache |
| Ligne de méthode | Positions de référence (Lucena, Philidor) | Suite de coups attendus avec commentaire ; tout autre coup est refusé avec indice |
| Stockfish WASM | Plus de 7 pièces | Évaluation dans le navigateur, seuil de tolérance configurable par position |

Pour le juge Syzygy, le temps perdu se mesure avec la distance au zéroing (DTZ) ou au mat (DTM) quand elle est disponible. Le camp adverse choisit le coup qui résiste le plus longtemps en attaque, et celui qui laisse le moins de réponses tenables en défense.

### Interface de l'échiquier

chessground (l'échiquier de Lichess) : glisser-déposer et clic, flèches, surlignage du dernier coup, promotion avec choix de pièce, notation française (R, D, T, F, C), orientation selon le camp du joueur, coordonnées, sons optionnels.

## Programme des 300 positions

Les 300 positions de départ se répartissent sur 7 familles, de la plus fréquente en partie à la plus rare. Le parcours gratuit « Fondamentaux » en contient 40.

| Famille | Thèmes | Positions | Niveau | Gratuit |
| --- | --- | --- | --- | --- |
| Finales de pions | Opposition, cases clés, carré (20) ; tempo, triangulation, opposition à distance (15) ; pion de tour et pat (8) ; majorités, pion passé éloigné, percée (20) ; courses de pions, promotion avec échec (12) ; études de pions (15) | 90 | Débutant à avancé | 20 |
| Finales de tours | Lucena, Philidor, frontale, Vancura, petit côté (30) ; roi coupé (15) ; tour derrière le pion passé, activité de la tour (15) ; tour et deux pions contre tour (20) | 80 | Intermédiaire à avancé | 0 |
| Pièces mineures | Fou contre pions, couleurs opposées (15) ; cavalier contre pions (12) ; fou contre cavalier (13) ; fou et pion contre fou (10) ; mauvais fou (5) | 55 | Intermédiaire à avancé | 0 |
| Finales de dame | Dame contre pion en 7e (12) ; dame contre tour (8) ; dame et pion contre dame (5) | 25 | Intermédiaire à avancé | 0 |
| Mats élémentaires | Dame (4), tour (6), deux fous (4), fou et cavalier (6) | 20 | Débutant à avancé | 20 |
| Tour contre pièce mineure | Tour contre fou, tour contre cavalier, tour et fou contre tour | 20 | Avancé | 0 |
| Études célèbres | Réti, Saavedra, Troitzky et autres classiques | 10 | Avancé | 0 |

Origine et validation des positions, à faire par Claude Code dans un script de génération :

1. Positions de théorie (Lucena, Philidor, Vancura, études) : saisies à la main à partir de la théorie classique, avec leur ligne de méthode.
2. Positions d'application : extraites de la base de puzzles de Lichess (licence CC0) filtrée sur les thèmes de finale (pawnEndgame, rookEndgame, queenEndgame, bishopEndgame, knightEndgame), au plus 7 pièces, cote entre 800 et 2200.
3. Chaque position de 7 pièces ou moins est vérifiée par l'API tablebase : le résultat attendu et le camp à jouer doivent correspondre, sinon elle est rejetée.
4. Les autres sont vérifiées par Stockfish à profondeur 30 (écart de plus de 2 pions exigé pour un gain).
5. Un fichier `seed/positions.json` versionné contient le tout ; un joueur confirmé relit chaque leçon et chaque position avant publication.

## Répétition espacée

La planification utilise FSRS via la bibliothèque ts-fsrs, avec les paramètres par défaut au départ, puis une optimisation par joueur dès 200 révisions.

Chaque position jouée par un joueur est une carte. La note est calculée automatiquement, le joueur ne s'auto-évalue pas :

| Note FSRS | Condition |
| --- | --- |
| Again (1) | Au moins un coup perdant, ou abandon |
| Hard (2) | Annonce fausse, ou au moins un temps perdu, ou indice demandé |
| Good (3) | Annonce juste et aucun écart |
| Easy (4) | Annonce juste, aucun écart, et temps de réflexion inférieur à un seuil par coup (5 s par défaut) |

Règles de séance :

- La séance quotidienne propose d'abord les cartes dues, de la plus en retard à la plus récente, puis les nouvelles cartes.
- Limites réglables : 10 nouvelles positions par jour, 100 révisions par jour (limitées par les quotas de l'offre gratuite).
- Les nouvelles positions sont choisies par thème dans un ordre pédagogique, puis par difficulté proche de l'Elo de finales du joueur.
- Une carte ratée revient dans la même séance après 10 minutes ou 5 autres cartes.
- Variantes d'une même position (trait inversé, position symétrique) : cartes distinctes mais reliées, jamais proposées le même jour.
- Le joueur peut suspendre une carte ou réinitialiser un thème.

Un journal de révision conserve chaque passage (note, durée, coups joués) pour l'optimisation FSRS et les statistiques.

## Classement et récompenses

La gamification récompense la régularité et la précision, jamais le volume brut : rejouer en boucle une position déjà maîtrisée ne rapporte rien.

### Elo de finales

Chaque joueur et chaque position ont une cote Glicko-2 (départ à 1500, ou dérivée de l'Elo Lichess importé). Une position réussie (note Good ou Easy) compte comme une victoire du joueur, Hard comme une demi-partie, Again comme une défaite. Seul le premier passage du jour sur une position compte. Les cotes des positions s'ajustent aussi, ce qui calibre la difficulté sans intervention manuelle.

### XP et niveaux

| Action | XP |
| --- | --- |
| Carte due revue, note Good ou Easy | 10 |
| Carte due revue, note Hard | 5 |
| Nouvelle position réussie | 15 |
| Annonce juste | +3 |
| Séance quotidienne terminée | 20 |
| Thème entièrement maîtrisé | 100 |

Les niveaux suivent une courbe progressive (niveau n atteint à 100 × n^1,5 XP cumulés). Les cartes revues avant leur échéance ne donnent pas d'XP.

### Séries

Une série compte les jours consécutifs avec une séance terminée. Un « gel de série » est gagné tous les 7 jours (2 en réserve au maximum) et protège un jour manqué. Si la série est en danger, un e-mail de rappel part à 19 h (heure du joueur), au plus une fois par jour, désactivable en un clic. Le jour se calcule dans le fuseau horaire du joueur.

### Maîtrise et blasons

Chaque thème a un niveau de maîtrise : Bronze, Argent, Or, Maître, selon la part des positions du thème dont la stabilité FSRS dépasse 7, 21, 60 et 180 jours. Le profil affiche un blason par thème.

### Trophées

Une trentaine au lancement, définis en base (code, nom, description, condition, icône) pour en ajouter sans redéployer. Exemples : première promotion, 10 annonces justes d'affilée, 7 jours de série, Lucena sans faute, toutes les positions d'opposition en Or, aucune case rouge sur 20 positions.

### Classements

- Global : par Elo de finales, joueurs avec au moins 30 positions jouées.
- Hebdomadaire : par XP gagnés du lundi au dimanche, remis à zéro chaque lundi à minuit (heure de Paris).
- Version 2, ligues : groupes de 30 joueurs de niveau proche, 7 divisions (Pion à Roi), les 7 premiers montent, les 5 derniers descendent.
- Version 2, clubs : un joueur rejoint un club (le Cercle d'échecs spicéen sera le club pilote) et voit le classement interne.

Le joueur peut masquer son profil des classements publics.

## Architecture et stack

Monorepo TypeScript : une application Next.js (App Router) et un paquet `packages/core` qui contient toute la logique d'échecs, partagée entre le navigateur et le serveur. Le navigateur juge immédiatement ; le serveur rejoue les coups pour noter et attribuer l'XP.

```
┌─────────────────────────┐   ┌─────────────────────────┐   ┌──────────────────────────────┐
│ Navigateur (PWA)        │   │ Serveur Next.js         │   │ Données et services externes │
│                         │   │                         │   │                              │
│ Interface Next.js       │──▶│ API REST (Zod)          │──▶│ Connexion Lichess (OAuth)    │
│   séance, profil,       │   │   coups rejoués         │   │                              │
│   classement            │   │   côté serveur          │   │                              │
│         │               │   │         │               │   │                              │
│ Échiquier chessground   │   │ Services métier         │──▶│ Neon PostgreSQL (Prisma)     │
│   barre de tempo        │   │   juge, FSRS, Glicko-2, │──▶│ API tablebase Lichess        │
│         │               │   │   XP, quotas            │──▶│ Stripe, Resend               │
│ packages/core  ─ ─ ─ ─ ─│─ ─│─▶ (même code)           │   │                              │
│   juge KPK, lignes,     │   │         ▲               │   │                              │
│   FSRS                  │   │ Tâches planifiées       │   │                              │
│                         │   │   classements, e-mails  │   │                              │
└─────────────────────────┘   └─────────────────────────┘   └──────────────────────────────┘
```

| Couche | Choix |
| --- | --- |
| Front | Next.js 15, React, Tailwind, chessground, chess.js, next-intl, PWA |
| Logique | packages/core : juge KPK, lignes de méthode, ts-fsrs, Glicko-2, règles d'XP, quotas |
| Moteur | Stockfish WASM dans un Web Worker (positions de plus de 7 pièces) |
| Back | Route handlers Next.js, Zod, Auth.js (e-mail et OAuth Lichess) |
| Hébergement | Vercel (fonctions en région Paris ou Francfort), Vercel Cron pour les tâches planifiées |
| Données | Neon PostgreSQL (région Francfort) et Prisma |
| Externe | API Lichess (tablebase, OAuth, export de parties, base de puzzles), Resend (e-mails), Stripe (Checkout, Billing, Tax, portail client) |
| Outillage | pnpm, Vitest, Playwright, GitHub Actions, Sentry |

## Modèle de données

PostgreSQL, schéma géré par Prisma. Tables principales :

| Table | Champs clés | Rôle |
| --- | --- | --- |
| users | id, email, display_name, lichess_id, locale, timezone, public_profile, founder, club_id, created_at | Comptes |
| user_settings | user_id, new_per_day, reviews_per_day, hold_moves, sound, email_streak_reminder | Réglages |
| subscriptions | user_id, plan (free, premium), status, billing_period (mensuel, annuel), stripe_customer_id, stripe_subscription_id, current_period_end, founder_discount | Droits et abonnement |
| daily_usage | user_id, day, new_positions, reviews, explanations | Compteurs des quotas gratuits |
| clubs | id, name, slug, invite_code | Clubs (version 2) |
| themes | id, slug, family, order, title (JSON par langue), free | Thèmes pédagogiques |
| lessons | id, theme_id, order, content (Markdown + coups, JSON par langue), free | Leçons |
| positions | id, theme_id, fen, user_side, expected_result, judge_type, line_moves (JSON), texts (JSON par langue), source (théorie, puzzle Lichess), rating, rating_deviation, free, status | Contenu |
| position_links | position_id, linked_id, kind (trait inversé, symétrie) | Variantes reliées |
| cards | user_id, position_id, fsrs_state (stability, difficulty, due, reps, lapses, state), suspended | État FSRS par joueur |
| review_logs | id, user_id, position_id, rating, announce_ok, errors, tempo_lost, duration_ms, moves (JSON), reviewed_at | Historique |
| player_ratings | user_id, rating, deviation, volatility, games | Elo de finales |
| xp_events | id, user_id, amount, reason, created_at | Source de vérité de l'XP |
| streaks | user_id, current, best, freezes, last_day | Séries |
| achievements | code, name, description, condition (JSON), icon | Catalogue des trophées |
| user_achievements | user_id, code, unlocked_at | Trophées obtenus |
| email_log | user_id, kind, sent_at | Anti-doublon des rappels |
| tablebase_cache | fen_normalized, payload (JSON), fetched_at | Cache Syzygy |

Les classements se calculent par vues matérialisées rafraîchies toutes les 5 minutes, et non à chaque requête.

## API et services

API REST en route handlers Next.js, validée par Zod. Le serveur est la seule source de vérité pour les notes, l'XP, les quotas et les cotes : le client envoie les coups joués, le serveur rejoue la partie et recalcule le résultat.

| Méthode et route | Rôle |
| --- | --- |
| GET /api/session/today | Cartes dues et nouvelles positions de la séance |
| GET /api/positions?theme=&page= | Bibliothèque filtrée |
| GET /api/positions/:id | Position, textes, ligne de méthode |
| POST /api/judge/:positionId | Juge un coup (Syzygy) : coups gagnants, distance, réponse adverse |
| POST /api/reviews | Fin de position : coups, annonce, durée ; renvoie note, XP, nouvelle échéance, trophées débloqués |
| GET /api/me/stats | Elo, maîtrise par thème, calendrier, série |
| GET /api/me/entitlements | Offre, quotas restants du jour |
| GET /api/leaderboards/:kind | Classement global ou hebdomadaire, paginé |
| PATCH /api/me/settings | Réglages |
| POST /api/billing/checkout | Session Stripe Checkout (mensuel ou annuel) |
| POST /api/billing/portal | Ouverture du portail client Stripe |
| POST /api/billing/webhook | Webhooks Stripe signés (abonnement créé, renouvelé, annulé, remboursé) |
| GET /api/email/unsubscribe?token= | Désinscription en un clic des rappels |
| /api/admin/positions | Création, validation, publication (rôle admin) |

Services internes :

- **JudgeService** : choisit le juge selon le type de position. Le juge KPK est partagé entre client et serveur (même module TypeScript).
- **TablebaseClient** : appelle tablebase.lichess.ovh, normalise la FEN, met en cache, limite à 1 requête par seconde comme demandé par Lichess, et prévoit un serveur Syzygy auto-hébergé si le volume l'exige.
- **SchedulerService** : ts-fsrs, calcul de la note à partir du journal de la position.
- **RatingService** : Glicko-2 joueur contre position.
- **GamificationService** : XP, séries, trophées, déclenché après chaque révision, dans une transaction.
- **EntitlementService** : offre du joueur, quotas du jour, accès aux positions et leçons premium.
- **Tâches planifiées** (Vercel Cron) : rafraîchissement des classements, remise à zéro hebdomadaire, rappels e-mail de série.

Usages de l'API Lichess (lichess.org/api), avec un jeton d'application et un en-tête User-Agent identifiant le projet :

- **Tablebase** (tablebase.lichess.ovh/standard) : juge exact jusqu'à 7 pièces, résultats mis en cache dans Neon.
- **OAuth 2.0 avec PKCE** : connexion « avec Lichess », lecture du pseudo et de la cote pour calibrer le niveau de départ.
- **Export de parties** (/api/games/user/{pseudo}) : en version 2, import des finales des parties du joueur (premium).
- **Base de puzzles** (database.lichess.org, CC0) : source des positions d'application, importée hors ligne par le script de génération.

E-mails transactionnels et rappels via Resend (domaine vérifié SPF/DKIM), gabarits React Email en français et en anglais.

## Exigences non fonctionnelles

- **Performance** : première page interactive en moins de 2 s sur mobile 4G ; réponse du juge en moins de 300 ms (cache) ou 1 s (appel Syzygy).
- **Mobile d'abord** : utilisable sur écran de 360 px, échiquier tactile, installable en PWA, mode hors ligne pour les positions KPK et les lignes de méthode déjà chargées.
- **Accessibilité** : WCAG 2.1 AA, navigation au clavier sur l'échiquier, annonces vocales des coups, thèmes clair et sombre, mouvement réduit respecté.
- **Langues** : français et anglais (next-intl), notation des pièces selon la langue.
- **RGPD** : hébergement en Union européenne, export et suppression du compte, consentement explicite pour les e-mails, aucun traceur publicitaire.
- **Sécurité** : sessions Auth.js, limitation de débit sur les routes de jeu, validation serveur de tous les coups, rôles et droits vérifiés côté serveur, webhooks Stripe signés.
- **Qualité** : TypeScript strict, tests unitaires Vitest (juges, FSRS, Glicko, XP, quotas), tests de bout en bout Playwright sur les parcours principaux, intégration continue GitHub Actions.
- **Observabilité** : Sentry pour les erreurs, journaux structurés, statistiques produit sans cookie (Plausible ou équivalent).

## Plan de livraison pour Claude Code

Le projet se construit en 7 lots, chacun livré dans une branche avec ses tests, et validé avant le suivant. Ce fichier `SPEC.md` est à la racine du dépôt ; un `CLAUDE.md` rappelle la stack, les conventions et la commande de test.

| Lot | Contenu | Critère d'acceptation |
| --- | --- | --- |
| 1. Socle | Next.js sur Vercel, Neon et Prisma, Auth.js (e-mail et Lichess), i18n, thèmes, EntitlementService et quotas, CI, préproduction | Inscription, connexion Lichess, quotas gratuits appliqués côté serveur, pipeline vert |
| 2. Moteur de jeu | Échiquier chessground, juge KPK partagé, lignes de méthode, barre de tempo, reprise des 12 positions du prototype | Les 12 positions jouables ; tests du juge KPK sur 20 positions de référence |
| 3. Juges complets | Client tablebase Lichess et cache, Stockfish WASM, jeu libre depuis une FEN, explication d'erreur | 30 positions de tours et 20 de pièces mineures jugées correctement ; temps perdus détectés |
| 4. Contenu | Script de génération et de validation, 300 positions, leçons de chaque thème, back-office de relecture | 300 positions validées par tablebase ou Stockfish ; 40 marquées gratuites |
| 5. Répétition espacée | Cartes, journal, séance quotidienne, notation automatique, bilan | Une carte ratée revient dans la séance ; échéances conformes à ts-fsrs ; quotas respectés |
| 6. Gamification et e-mails | Elo Glicko-2, XP, niveaux, séries, gels, maîtrise, trophées, classements, rappels Resend | Série correcte selon le fuseau ; pas d'XP pour révision anticipée ; un seul e-mail par jour |
| 7. Premium | Stripe (mensuel, annuel), page Tarifs avec sélecteur Mensuel / Annuel, statut membre fondateur, PWA | Un paiement de test ouvre l'accès premium ; une résiliation le retire à la fin de la période ; un remboursement le retire immédiatement |

Consignes de travail pour Claude Code :

- Commencer chaque lot par un plan écrit et le faire valider.
- Toute logique métier (juges, FSRS, Glicko, XP, quotas) dans `packages/core`, testée indépendamment de l'interface.
- Ne jamais coder une position en dur hors des fichiers de données de départ (`seed`).
- Vérifier chaque position de départ contre les tables Syzygy avant publication : le résultat attendu doit correspondre.

## Décisions

- [x] Nom : ZugChess. Aucune application d'échecs ne porte ce nom à ce jour. Il reste à déposer la marque (INPI ou EUIPO) et à réserver zugchess.com et zugchess.app.
- [x] Modèle économique : gratuit au lancement avec quotas actifs, Premium ensuite à 6,99 € par mois ou 59 € par an.
- [x] Paiement : Stripe, mensuel et annuel, avec Stripe Tax.
- [x] Hébergement : Vercel et Neon.
- [x] Tables de finales et connexion : API Lichess.
- [x] Sélection des 300 positions : programme fixé ci-dessus, positions générées et validées automatiquement.
- [x] Rappels de série : par e-mail.
- [x] Club pilote : Cercle d'échecs spicéen.
- [x] Relecture des leçons et des positions : un joueur confirmé.
- [ ] Inscription à l'OSS pour la TVA européenne : à valider avec l'expert-comptable avant d'ouvrir le Premium.
