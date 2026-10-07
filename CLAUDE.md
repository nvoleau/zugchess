# ZugChess — guide pour Claude Code

Voir `SPEC.md` pour le cahier des charges complet. Ce fichier résume la stack et les conventions pour travailler lot par lot.

## Stack

- Monorepo pnpm : `apps/web` (Next.js 15, App Router) + `packages/core` (logique métier pure, partagée navigateur/serveur).
- Base de données : Neon PostgreSQL + Prisma (`prisma/schema.prisma` à la racine).
- Auth : Auth.js (provider Email lien magique, provider OAuth générique pour Lichess).
- i18n : next-intl, locales `fr` (défaut) et `en`, routing `/[locale]/...`.
- UI : Tailwind CSS, thème clair/sombre via `next-themes`.
- Tests : Vitest pour `packages/core`, Playwright prévu pour les parcours bout en bout (lots suivants).
- CI : GitHub Actions (`.github/workflows/ci.yml`).
- Hébergement visé : Vercel (fonctions Paris/Francfort) + Neon (Francfort).

## Conventions

- Toute logique métier (juges, FSRS, Glicko, XP, quotas) vit dans `packages/core`, testée indépendamment de l'UI et de Prisma.
- Aucune position d'échecs codée en dur hors des fichiers `seed/` (à partir du lot 4).
- Le serveur est la seule source de vérité pour les notes, l'XP, les quotas et les cotes.
- Chaque lot démarre par un plan écrit et validé avant codage (voir `SPEC.md`, section "Plan de livraison").

## Commandes

```bash
pnpm install
pnpm --filter core test      # tests unitaires de packages/core (Vitest)
pnpm --filter web dev        # serveur de dev Next.js
pnpm lint
pnpm typecheck
pnpm build
pnpm prisma:generate
pnpm prisma:migrate          # créer/appliquer une migration en dev
```

## État des lots

- [x] Lot 1 — Socle : Next.js/Vercel, Neon/Prisma, Auth.js (e-mail + Lichess), i18n, thèmes, EntitlementService et quotas, CI, config préproduction.
- [x] Lot 2 — Moteur de jeu : échiquier chessground, juge KPK partagé (+ réponse automatique `bestKpkReply`, attaquant et défenseur), lignes de méthode, barre de tempo, annonce du résultat avant de jouer, les 12 positions du prototype « Finales au tempo » reprises (`apps/web/src/content/finales-tempo.ts`).
- [ ] Lot 3 — Juges complets : **en cours**. Fait — juge Syzygy pur et testé (`packages/core/src/judge/syzygy.ts`), `TablebaseCache` (modèle Prisma + migration `20261007090000_tablebase_cache`, pas encore appliquée faute d'accès DB depuis ce sandbox), `TablebaseClient` (cache + limite 1 req/s), `POST/GET /api/judge/syzygy`, juge Stockfish pur et testé (`packages/core/src/judge/stockfish.ts`, seuil de tolérance configurable), moteur WASM `apps/web/public/stockfish/` (build lite-single mono-thread du paquet npm `stockfish` v19, ~1,8 Mo, pas de COOP/COEP requis) + `StockfishEngine` (worker, protocole UCI), jeu libre (`/app/free-play` : coller une FEN ou choisir une famille, bascule Syzygy/Stockfish selon le nombre de pièces). Promotion avec choix de pièce dans `ChessBoard` (D/T/F/C), partagée par tous les entraîneurs. Explication d'erreur (SPEC.md) : coup juste + suite principale (5 coups) affichés après un blunder dans les trois juges — `kpkPrincipalVariation` (pur, testé), `syzygyPrincipalVariation` (boucle serveur dans la route), PV Stockfish (parsée depuis la recherche déjà en cours, gratuite) ; le rappel du thème/principe existe déjà pour les cartes du lot 2 via `card.intro`, toujours affiché pendant le jeu. **Vérifié en conditions réelles** : le moteur Stockfish se charge et évalue correctement dans un vrai navigateur (worker + WASM testés en direct). **Non vérifié** : la forme exacte des réponses `tablebase.lichess.ovh` (réseau indisponible ici), et toute interaction clic/glisser sur l'échiquier depuis l'ajout du sélecteur de promotion et des suites principales — l'outil de navigateur automatisé ne délivre plus aucun clic dans cette session (confirmé avec un lien de changement de langue, sans rapport avec le code). Reste à faire : les 30 positions de tours + 20 de pièces mineures de l'acceptance du lot.
- [ ] Lot 4 — Contenu (300 positions) : **en cours (backend seulement pour l'instant)**. Fait — modèle de données complet (`Theme`, `Lesson`, `Position`, `PositionLink`, migration `20261007110000_content_lot4`, pas encore appliquée faute d'accès DB), `prisma/seed.ts` (idempotent, migre les 12 positions du lot 2 en base — c'est la première vraie utilisation de la convention `seed/` prévue par CLAUDE.md), `PositionService` (liste paginée par thème, détail par id, projection de langue), `JudgeService` (dispatch par `judgeType` vers les juges déjà construits : kpk/line/syzygy côté serveur, stockfish reste côté navigateur), routes `GET /api/positions`, `GET /api/positions/:id`, `POST /api/judge/:positionId`. **Non vérifié** : tout ce qui touche la DB (migration non appliquée, seed jamais exécuté, routes jamais appelées) — réseau/DB indisponibles dans ce sandbox pendant toute la session. **Décision délibérée** : l'UI du lot 2 (`FinaleSession`) n'a *pas* été migrée vers cette API — elle continue de lire `apps/web/src/content/finales-tempo.ts` en statique, pour ne pas casser un parcours qui marche sur une base que je ne peux pas tester ici. À faire ensuite, une fois la DB vérifiable : lancer la migration + le seed, brancher `FinaleSession` sur l'API, puis attaquer les 300 positions (script de génération/validation, back-office de relecture, leçons).
- [ ] Lot 5 — Répétition espacée : **en cours (backend seulement)**. Fait — `packages/core/src/scheduler/fsrs.ts` (`rateReview` : applique le barème Again/Hard/Good/Easy de SPEC.md à partir du déroulé réel de la révision, jamais une auto-évaluation ; `newCardState`/`scheduleNextReview` enveloppent `ts-fsrs`), `sessionQueue.ts` (`buildSessionQueue` : cartes dues triées par échéance puis nouvelles positions triées par ordre pédagogique du thème puis proximité de cote, chacune tronquée par son quota), 14 tests couvrant tout le barème + la montée en lapses après plusieurs révisions réussies. Modèle de données `Card`/`ReviewLog` (SPEC.md), migration `20261007120000_scheduler_lot5` (pas encore appliquée faute d'accès DB), `SchedulerService` (`getTodaySession` croise cartes dues + nouvelles positions avec les réglages du joueur et les quotas restants de son offre ; `recordReview` calcule la note, met à jour la carte FSRS et journalise), routes `GET /api/session/today`, `POST /api/reviews`. **Non vérifié** : tout ce qui touche la DB (migration non appliquée, routes jamais appelées) — réseau/DB toujours indisponibles dans ce sandbox. Volontairement absent : XP et trophées dans la réponse de `POST /api/reviews` (lot 6) ; `player_ratings`/Glicko (cote du joueur utilisée à 1500 par défaut pour trier les nouvelles positions). À faire ensuite : appliquer la migration, brancher une UI de séance sur `/api/session/today` + `/api/reviews`.
- [ ] Lot 6 — Gamification et e-mails
- [ ] Lot 7 — Premium (Stripe)
- [ ] Back-office admin (hors plan initial) : **en cours**. Demandé par l'utilisateur en cours de session (vue + gestion des comptes, en plus du back-office positions déjà prévu par SPEC.md au lot 4). Fait — champ `role` (`player`/`admin`) sur `User`, migration `20261007130000_admin_role` (pas encore appliquée faute d'accès DB), `requireAdminSession`/`requireAdminApi` (`apps/web/src/lib/adminAuth.ts`), `AdminUserService` (liste/détail/override abonnement sans Stripe) et `AdminPositionService` (CRUD positions + lignes de méthode, saisies en texte `SAN | commentaire fr | commentaire en` et rejouées avec chess.js pour vérifier la légalité), routes `GET/PATCH /api/admin/users[/:id]`, `GET/POST/PATCH /api/admin/positions[/:id]`, pages `admin/users`, `admin/users/:id`, `admin/positions`, `admin/positions/new`, `admin/positions/:id` (server actions, zéro JS client). Premier admin promu via `ADMIN_EMAILS` (`.env.example`) + `prisma/seed.ts` (jamais via l'UI, pour éviter l'auto-élévation de privilège). **Non vérifié** : tout ce qui touche la DB (migration non appliquée, aucune page/route jamais appelée) — réseau/DB toujours indisponibles dans ce sandbox. Volontairement absent : suspension/bannissement de compte, édition du rôle depuis l'UI (voir ci-dessus).

## Configuration externe requise (à faire par l'utilisateur)

- Créer un projet Neon (région Francfort) et renseigner `DATABASE_URL`.
- Enregistrer une application OAuth sur https://lichess.org/account/oauth/app (callback `${AUTH_URL}/api/auth/callback/lichess`) et renseigner `LICHESS_CLIENT_ID` / `LICHESS_CLIENT_SECRET`.
- Créer un compte Resend, vérifier un domaine (SPF/DKIM) et renseigner `RESEND_API_KEY` (sinon les liens de connexion s'affichent dans les logs serveur).
- Créer un projet Vercel lié au dépôt GitHub (une fois poussé), régler le "Root Directory" sur `apps/web` et y copier les variables d'environnement de `.env.example`.
