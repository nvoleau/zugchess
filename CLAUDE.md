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
- [ ] Lot 3 — Juges complets : **en cours**. Fait — juge Syzygy pur et testé (`packages/core/src/judge/syzygy.ts`), `TablebaseCache` (modèle Prisma + migration `20261007090000_tablebase_cache`, pas encore appliquée faute d'accès DB depuis ce sandbox), `TablebaseClient` (cache + limite 1 req/s), `POST/GET /api/judge/syzygy`, jeu libre (`/app/free-play`, coller une FEN ou choisir une famille). **Non vérifié en conditions réelles** : la forme exacte des réponses `tablebase.lichess.ovh` n'a pas pu être confirmée (réseau indisponible ici) — à vérifier une fois déployé. Reste à faire : Stockfish WASM (+7 pièces), explication d'erreur détaillée (suite principale 5 coups + principe du thème), les 30 positions de tours + 20 de pièces mineures de l'acceptance du lot.
- [ ] Lot 4 — Contenu (300 positions)
- [ ] Lot 5 — Répétition espacée
- [ ] Lot 6 — Gamification et e-mails
- [ ] Lot 7 — Premium (Stripe)

## Configuration externe requise (à faire par l'utilisateur)

- Créer un projet Neon (région Francfort) et renseigner `DATABASE_URL`.
- Enregistrer une application OAuth sur https://lichess.org/account/oauth/app (callback `${AUTH_URL}/api/auth/callback/lichess`) et renseigner `LICHESS_CLIENT_ID` / `LICHESS_CLIENT_SECRET`.
- Créer un compte Resend, vérifier un domaine (SPF/DKIM) et renseigner `RESEND_API_KEY` (sinon les liens de connexion s'affichent dans les logs serveur).
- Créer un projet Vercel lié au dépôt GitHub (une fois poussé), régler le "Root Directory" sur `apps/web` et y copier les variables d'environnement de `.env.example`.
