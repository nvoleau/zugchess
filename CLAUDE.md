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
- [ ] Lot 5 — Répétition espacée
- [ ] Lot 6 — Gamification et e-mails
- [ ] Lot 7 — Premium (Stripe)

## Configuration externe requise (à faire par l'utilisateur)

- Créer un projet Neon (région Francfort) et renseigner `DATABASE_URL`.
- Enregistrer une application OAuth sur https://lichess.org/account/oauth/app (callback `${AUTH_URL}/api/auth/callback/lichess`) et renseigner `LICHESS_CLIENT_ID` / `LICHESS_CLIENT_SECRET`.
- Créer un compte Resend, vérifier un domaine (SPF/DKIM) et renseigner `RESEND_API_KEY` (sinon les liens de connexion s'affichent dans les logs serveur).
- Créer un projet Vercel lié au dépôt GitHub (une fois poussé), régler le "Root Directory" sur `apps/web` et y copier les variables d'environnement de `.env.example`.
