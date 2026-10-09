# AUDIT ZugChess — avant refonte

> Rédigé le 2026-10-09. Voir les captures dans `docs/screenshots/avant/`.

---

## 1. Architecture actuelle

### Pages et routage

```
app/[locale]/
├── (default)/          ← layout générique (logo + LocaleSwitcher + ThemeToggle, max-w-2xl)
│   ├── try/page.tsx    ← onboarding sans compte (FinaleSession + KpkTrainer)
│   └── login/page.tsx
├── app/                ← layout sombre de marque (AppNav, UserMenu, auth guard)
│   ├── page.tsx        ← tableau de bord (stats FSRS, quotas)
│   ├── play/           ← séance FSRS (SessionPlayer → SessionCard)
│   ├── free-play/      ← jeu libre (FreePlay, choix FEN/famille)
│   ├── lessons/        ← liste thèmes + étude position (StudyClient)
│   └── ranking/        ← classements (3 onglets : rating/xp/streak)
└── page.tsx            ← accueil marketing
```

### Composants d'échiquier

| Composant | Fichier | Librairie | Taille max | Usage |
|---|---|---|---|---|
| `ChessBoard` | `components/chess-board.tsx` | **chessground** (GPL) | 480px responsive | Universel |
| `KpkTrainer` | `components/play/kpk-trainer.tsx` | via ChessBoard | 480px | Séance + /try |
| `SyzygyTrainer` | `components/play/syzygy-trainer.tsx` | via ChessBoard | 480px | Séance |
| `MethodLineTrainer` | `components/play/method-line-trainer.tsx` | via ChessBoard | défaut | Séance |
| `StockfishTrainer` | `components/play/stockfish-trainer.tsx` | via ChessBoard + SF WASM | défaut | Séance + jeu libre |
| `HeroTrial` | `components/marketing/hero-trial.tsx` | via KpkTrainer | 400px | Hero marketing |

### Flux d'onboarding

```
/ (accueil marketing)
  → "Essayer sans compte" → /try
      → FinaleSession (3 positions KPK aléatoires via randomWinningKpkFen)
      → AnnounceStep → KpkTrainer (jeu contre juge KPK bitboard)
      → résultat inline (won / held draw)
  → "Créer mon compte" → /login (magic link ou OAuth Lichess)
  → /app (dashboard + séance FSRS)
```

### Auth

Auth.js v5 beta : provider email (magic link via Resend) + provider OAuth Lichess.
Session server-side via `auth()` dans les layouts et les routes API.

### Données et répétition espacée

- `packages/core/src/scheduler/fsrs.ts` — algorithme FSRS (rateReview, scheduleNextReview)
- `packages/core/src/judge/kpk.ts` — bitboard KPK (randomWinningKpkFen, kpkDepth)
- `packages/core/src/judge/syzygy.ts` — juge Syzygy (appel API tablebase Lichess)
- `packages/core/src/judge/stockfish.ts` — juge Stockfish (évaluation seuil)
- `SchedulerService` — buildSessionQueue, getTodaySession, recordReview
- `GamificationService` — XP, Glicko-2, séries, achievements
- Stockfish **WASM dans le navigateur** : `apps/web/public/stockfish/stockfish-19-lite-single.{js,wasm}` (1,8 Mo)

### Paiement

Stripe non encore implémenté (Lot 7 prévu). `EntitlementService` retourne `plan: "free"` pour tous.

---

## 2. Audit des licences

### Résultat `license-checker --production` (depuis `apps/web`)

```
MIT: 7
ISC: 2
UNLICENSED: 2   ← @zugchess/core (privé, OK) + web (privé, OK)
GPL-3.0-or-later: 1  ← @lichess-org/chessground
Apache-2.0: 1
BSD-2-Clause: 1
```

### Dépendances GPL / problématiques

| Paquet | Version | Licence | Usage | Problème |
|---|---|---|---|---|
| `@lichess-org/chessground` | 10.4.2 | **GPL-3.0-or-later** | Rendu échiquier (universel) | Incompatible avec code source fermé commercial |
| `stockfish-19-lite-single.js` | build SF 19 | **GPL-3.0** | WASM dans le navigateur (StockfishEngine) | Fichier statique distribué aux clients — obligation de fournir les sources |

### Risque juridique

La GPL-3.0 exige que tout logiciel la *distribuant* (y compris via un navigateur web) soit lui-même open source et distribué sous GPL. ZugChess est un produit commercial à code source fermé : **la distribution de `chessground` et du WASM Stockfish est juridiquement non conforme**.

Action requise : remplacer les deux dépendances avant toute mise en production commerciale.

---

## 3. Audit ergonomique (critique des captures)

### Page d'accueil (`/fr`)

**Mobile — ce qui fonctionne :**
- En-tête compact : logo + CTA + hamburger ✓ (ajout récent)
- Titre accrocheur bien visible ✓
- Boutons suffisamment grands ✓

**Mobile — problèmes :**
- L'échiquier de démo (HeroTrial) n'est pas visible dans la portion au-dessus de la ligne de flottaison → le visiteur ne voit pas le produit en action
- Les stats "1000+ / 7 / 0" manquent de contexte — "0 approximation : juge exact" est obscur
- Aucun aperçu du déroulé d'une leçon

**Desktop — ce qui fonctionne :**
- Mise en page deux colonnes cohérente ✓
- Échiquier de démo visible ✓ (mais petit et peu lisible)

**Desktop — problèmes :**
- La démo hero montre un dialogue "Roi et pion contre roi / +10 XP" mais **l'échiquier n'est pas rendu** (le KpkTrainer attend le JS hydraté)
- Le score "0 approximation" est incompréhensible sans contexte

### Page onboarding (`/fr/try`)

**Mobile — ce qui fonctionne :**
- L'échiquier occupe toute la largeur ✓
- Pièces visibles (cburnett) ✓

**Mobile — problèmes CRITIQUES :**
1. **Lisibilité des pièces faible** : les pièces blanches (roi, pion) sont des silhouettes creuses sur fond crème — contraste insuffisant, surtout sur petits écrans ou en plein soleil
2. **Pas de défi visible** : "Dame dans 4 coups" et la barre de tempo apparaissent SOUS l'échiquier, hors du champ de vue initial. Le joueur ne sait pas ce qu'il doit faire
3. **Thème incohérent** : header "ZugChess" + boutons FR/EN + menu "Système" — look générique, pas l'identité de marque sombre
4. **Contexte nul** : pas de phrase-défi type "Les Blancs jouent et font dame — essayez !", pas d'explication du type de finale
5. **Boutons d'action hors champ** : "Jouer un coup" et "Recommencer" sont sous l'échiquier, invisibles sans scroll

**Desktop — problème BLOQUANT :**
- **L'échiquier n'est pas rendu du tout** — écran noir avec juste le titre. Le `KpkTrainer` ne monte pas avant que le JS ait hydraté et initialisé le juge KPK, ce qui prend plusieurs secondes — la capture Puppeteer (2s) n'attend pas assez, mais un vrai utilisateur sur réseau lent verrait pareil pendant 2-4s

### Page de jeu (`/app/play` — non capturée, auth requise)

D'après l'analyse du code :
- Panel latéral (`md:w-72`) ne s'affiche qu'à partir de `md` (768px) → sur tablette 768px exactement, tout est tassé
- Le texte d'intro du thème (`texts.goal`) est lisible, mais `texts.intro` (contexte pédagogique) est affiché uniquement dans la barre de tempo — difficile à relier à la position
- Pas de retour visuel clair coup juste/faux (rouge/vert) — juste un message texte "Bon coup" ou "Mauvais coup"

---

## 4. Plan de travail proposé (chantiers)

### Ordre d'exécution et dépendances

```
Chantier 1 — Échiquier (prérequis pour tout le reste)
  → Remplace chessground (GPL) + Stockfish WASM (GPL)
  → Nouveau composant <ZugBoard /> basé sur react-chessboard (MIT)
  → Pièces cburnett intégrées localement sous licence BSD
  → Retour visuel bon/mauvais coup (vert/rouge animé)

Chantier 2 — Onboarding "waouh" (dépend du Chantier 1)
  → 3-5 positions contre-intuitives sélectionnées à la main
  → Boucle : défi → essai → explication (flèches) → réessai → célébration
  → Jouable sans compte, conversion Lichess après 1ère réussite

Chantier 3 — Identité visuelle (peut démarrer en parallèle du Chantier 1)
  → 2 propositions graphiques (palette + typo + ambiance)
  → Attente validation avant implémentation
  → Tokens design, mode sombre, micro-interactions

Chantier 4 — Gamification compétitive (dépend des Chantiers 1 + 2)
  → ZugElo (Glicko-2 déjà partiellement implanté)
  → Zug Rush (nouveau mode contre la montre)
  → Défi du jour + partage Wordle
  → Ligues hebdomadaires
  → Précision contre tablebase
```

### Estimations

| Chantier | Complexité | Risques |
|---|---|---|
| 1 — Échiquier | Élevée — API react-chessboard ≠ chessground, refactoring profond | Régressions sur les 4 trainers + hero |
| 2 — Onboarding | Moyenne — positions à valider via tablebase | Sélection manuelle des positions |
| 3 — Identité | Faible tech, choix subjectif | Attente validation direction |
| 4 — Gamification | Très élevée — nouveaux modèles DB, logique serveur | Volume de code, anti-triche |

### Ce que je vais attendre avant de commencer

**→ Ta validation sur ce plan, et en particulier :**
1. Confirmer l'ordre des chantiers (Chantier 1 en premier ?)
2. Pour le Chantier 3 : dois-je proposer les 2 directions graphiques avant de toucher au code, ou démarrer le Chantier 1 en parallèle ?
3. Pour le Chantier 4 (gamification) : priorité V1 complète, ou certains sous-chantiers en premier (ex. Zug Rush seulement) ?

---

## 5. Résumé des points bloquants

| Priorité | Problème | Chantier |
|---|---|---|
| 🔴 BLOQUANT | `chessground` GPL-3.0 distribué dans un produit fermé | 1 |
| 🔴 BLOQUANT | Stockfish WASM GPL-3.0 servi aux clients | 1 |
| 🟠 CRITIQUE | Page `/try` desktop : échiquier absent (écran noir) | 2 |
| 🟠 CRITIQUE | Onboarding : pas de défi visible, pas d'accroche | 2 |
| 🟡 IMPORTANT | Lisibilité des pièces sur fond clair (contraste faible) | 1 |
| 🟡 IMPORTANT | Hero démo : échiquier non rendu au premier chargement | 1 + 2 |
| 🟡 IMPORTANT | Incohérence visuelle `/try` vs app (thème, header) | 3 |
