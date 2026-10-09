# Mission : refonte UX de ZugChess (échiquier, onboarding, identité visuelle)

## Contexte

ZugChess (https://zugchess-phi.vercel.app/) est une application web d'entraînement aux finales d'échecs (pions, tours, tempo, et à terme toutes les finales), inspirée d'OpenChess : positions à jouer et à comprendre, répétition espacée, progression et récompenses. Stack : Next.js sur Vercel, base Neon, connexion via Lichess (OAuth), paiement Stripe. Modèle freemium : gratuit au départ, puis passage rapide au Premium (mensuel / annuel).

**C'est un produit commercial au code fermé : aucune dépendance sous licence GPL/AGPL n'est acceptable.**

Premier retour d'un testeur (joueur d'échecs) :
- les premières positions « de découverte » manquent de stimulation et n'incitent pas à souscrire ;
- l'ergonomie n'est pas agréable : diagrammes et échiquiers difficiles à lire ;
- le graphisme est peu engageant ;
- en revanche, l'idée est très bonne et les positions de jeu choisies sont excellentes, une fois qu'on est dans l'application.

Le cœur du produit est donc validé. Le problème, ce sont les premières minutes et l'emballage. C'est ce que tu dois corriger.

## Étape 0 : audit (avant toute modification)

1. Lis le code et résume l'architecture actuelle (pages, composants d'échiquier, données des positions, flux d'onboarding, auth, paiement).
2. Lance `npx license-checker --summary` (et `--production`). Liste toute dépendance GPL, AGPL, LGPL ou à licence inconnue, y compris les éventuels wrappers qui embarquent `chessground` ou Stockfish.
3. Installe Playwright et prends des captures de l'existant en **mobile (390×844)** et **desktop (1440×900)** : accueil, onboarding, une position, un écran de résultat. Range-les dans `docs/screenshots/avant/`.
4. Écris `docs/AUDIT.md` : problèmes d'ergonomie constatés (critique honnête de tes propres captures), problèmes de licence, et plan de travail.
5. **Présente-moi le plan et attends ma validation avant de coder.**

## Chantier 1 : l'échiquier

- Migrer tout l'affichage vers **`react-chessboard`** (licence MIT). Ajouter la directive `"use client"` dans les composants qui l'utilisent.
- Utiliser **`chess.js`** (BSD) pour les règles et la validation des coups.
- **Supprimer toute dépendance GPL** : `chessground` et ses wrappers, et Stockfish dans le navigateur. Si une évaluation moteur est nécessaire, passer par l'API Lichess (évaluation cloud / tablebases) côté serveur.
- Lisibilité, avec des exigences non négociables :
  - sur mobile, l'échiquier occupe toute la largeur utile (jamais moins de 320 px) et il est le premier élément visible ;
  - les coordonnées (a–h, 1–8) sont lisibles ;
  - les cases ont un contraste net mais reposant (pas de couleurs criardes) ;
  - le dernier coup est surligné ;
  - quand on sélectionne une pièce, des points indiquent les coups légaux ;
  - on peut jouer **au clic et au glisser-déposer** ;
  - les animations de pièces sont fluides (~200 ms) ;
  - l'échiquier est orienté selon le camp du joueur ;
  - une boîte de dialogue gère la promotion ;
  - des flèches et marqueurs servent aux explications pédagogiques ;
  - un retour visuel clair signale un bon coup (vert) ou un coup faux (rouge, avec la pièce qui revient en place), sans être agressif.
- Créer un composant unique `<ZugBoard />` réutilisé partout (positions, leçons, diagrammes statiques en mode lecture seule), pour que tout l'affichage soit cohérent.

### Pièces

- Utiliser le set **cburnett** (Colin M. L. Burnett, Wikimedia Commons) sous sa **licence BSD** (le set est multi-licencié, choisis explicitement l'option BSD). Intègre les SVG localement, ne les charge pas depuis un CDN tiers.
- Vérifie la licence des pièces par défaut de `react-chessboard`. Si elle n'est pas claire, n'utilise que cburnett.
- Crée `THIRD_PARTY_LICENSES.md` avec l'attribution et le texte de licence de chaque ressource tierce (pièces, polices, bibliothèques).
- Rends le jeu de pièces interchangeable (une configuration), car un set sur mesure est prévu plus tard.

## Chantier 2 : l'onboarding « waouh »

Objectif : dans les **60 premières secondes**, le joueur doit vivre un « je ne savais pas ça ». C'est ce moment qui donne envie de payer.

- Remplacer les positions de découverte actuelles par **3 à 5 finales contre-intuitives et spectaculaires**, accessibles à un joueur de club. Pistes : l'étude de Réti (le roi qui « court deux lièvres »), la percée de pions (trois contre trois), une opposition qui gagne alors que tout semble nul, une triangulation, la règle du carré présentée sous forme de défi.
- Chaque position suit cette boucle :
  1. un **défi** court (« Les Blancs jouent et font nulle. Impossible ? »), en une phrase ;
  2. le joueur essaie. S'il échoue, il obtient une **explication courte** avec des flèches sur l'échiquier ;
  3. il **réessaie et réussit** ;
  4. une **célébration** sobre et une barre de progression qui avance.
- Permettre de jouer les premières positions **sans compte**. Proposer ensuite la connexion Lichess pour sauvegarder la progression, puis présenter le Premium au bon moment (après une réussite, jamais avant la première). Rends le nombre de positions gratuites configurable.
- **Vérifie chaque position** : légalité de la FEN, et pour les finales ≤ 7 pièces, contrôle de la solution via l'API tablebase de Lichess. Ajoute un champ `reviewStatus: "à relire"` sur chaque nouvelle position : un joueur confirmé les relira avant la mise en production.
- Textes en français, ton chaleureux et un peu joueur, phrases courtes.

## Chantier 3 : identité visuelle

- Propose **2 directions graphiques** (palette, typographies, ambiance), avec une page de démo pour chacune, et attends mon choix. Le nom vient de *Zugzwang* : l'identité peut jouer sur la tension, le « coup juste », le temps.
- Une fois la direction choisie :
  - mettre en place des **design tokens** (couleurs, espacements, rayons, typographies) et un mode sombre ;
  - concevoir un écran d'accueil qui montre un échiquier en action dès le premier écran, au lieu d'un texte de présentation ;
  - ajouter des micro-interactions : réussite, série (streak), progression ;
  - soigner les états vides et les chargements.
- S'inspirer de l'**expérience** d'OpenChess (fluidité, progression, gratification), mais **ne copier ni ses visuels, ni ses textes, ni ses ressources**.
- Polices : uniquement des polices sous licence OFL ou équivalente (par exemple Google Fonts), auto-hébergées.

## Chantier 4 : gamification compétitive

Les joueurs d'échecs sont des compétiteurs. La gamification doit leur donner envie **d'en découdre** : un classement à défendre, des adversaires à battre, une raison de revenir chaque jour. Des badges décoratifs ne suffisent pas.

### V1 (prioritaire)

- **Classement ZugElo** (Glicko-2) : chaque joueur et chaque position ont une cote. Réussir une position mieux cotée que soi fait gagner beaucoup de points, échouer sur une position facile en fait perdre. Prévoir une cote globale et une cote par famille (pions, tours, pièces mineures, dames, tempo/opposition). Afficher la courbe de progression, le meilleur classement atteint et les points gagnés ou perdus à chaque coup, de façon visible et animée.
- **Zug Rush** (contre la montre) : enchaîner un maximum de finales en 3 ou 5 minutes, de difficulté croissante, avec élimination après 3 erreurs. Afficher le record personnel, un classement du jour, de la semaine et de tous les temps, et un écran de fin avec « Rejouer » mis en avant. C'est le mode « encore une ».
- **Défi du jour** : la même finale pour tout le monde. Classer les joueurs selon la réussite, le nombre d'essais et le temps. Ajouter un **partage façon Wordle** (petite grille d'emojis sans spoiler) pour WhatsApp et les réseaux.
- **Précision contre la tablebase** : en mode « convertis la finale », le joueur affronte une défense parfaite (API tablebase Lichess, côté serveur). Le score compare son nombre de coups au nombre optimal (« Gain en 14 coups, optimal 11 : précision 79 % »). Cela donne une raison objective de rejouer pour faire mieux.
- **Ligues hebdomadaires** : groupes d'environ 30 joueurs de niveau proche, avec promotion et relégation chaque dimanche (Pion → Cavalier → Fou → Tour → Dame → Roi). Les points de ligue viennent de toute l'activité de la semaine.
- **Classements de club et entre amis**. Un joueur peut rejoindre un club (premier club : le Cercle d'échecs spicéen) et retrouver un classement interne et un classement inter-clubs. On peut ajouter des amis via un lien.
- **Séries** : le compteur de jours consécutifs reste visible. Un « gel de série » est réservé au Premium. Les rappels de série partent par e-mail.

### V2 (préparer le modèle de données, ne pas développer maintenant)

- **Duels** : deux joueurs reçoivent la même série de positions. Celui qui est le plus juste et le plus rapide gagne, avec une cote de duel séparée. Version asynchrone d'abord (« Je te défie » via un lien), en direct ensuite.
- **Défis légendaires** : des études célèbres débloquées par niveau, avec un trophée et le nombre de joueurs qui les ont réussies.

### Règles de conception

- Chaque action fait bouger un chiffre visible (cote, rang, record, série). Aucune session ne se termine sans « tu as gagné/perdu X » et une invitation à rejouer.
- Montrer le **prochain objectif atteignable** (« Encore 12 points pour passer 1500 », « 3e de ta ligue, le 2e est à 40 points »).
- Les récompenses sont liées aux **concepts d'échecs** (« Maître de l'opposition », « Roi de Réti »), pas à des actions banales.
- **Répartition gratuit / Premium** : en gratuit, le défi du jour, 1 Rush par jour, la cote visible et la ligue. En Premium, le Rush illimité, les cotes par famille et leur historique, le gel de série et les duels. La compétition doit donner envie de payer sans exclure les joueurs gratuits.
- **Anti-triche** : la comparaison avec la tablebase et les temps de réponse permettent de détecter les profils anormaux (trop rapides et toujours parfaits). Les comptes suspects sont exclus des classements publics. Toute validation de score se fait côté serveur, jamais côté client.
- Les données (cotes, ligues, scores Rush, défi du jour) sont stockées dans Neon, avec des tables pensées pour les classements (index et agrégats). Le reset hebdomadaire des ligues passe par un cron Vercel.

## Contraintes

- Ne rien casser : connexion Lichess, Stripe, données Neon et répétition espacée doivent continuer à fonctionner. Ajoute ou mets à jour les tests sur ces parcours.
- Conception mobile d'abord. L'interface reste en français.
- Performance : Lighthouse mobile ≥ 90 en performance et en accessibilité sur l'accueil et sur une page de position.
- Travaille sur une branche dédiée, avec des commits séparés par chantier, et utilise un déploiement preview Vercel pour mes tests.

## Livrables et critères d'acceptation

- [ ] `docs/AUDIT.md` et le plan validé
- [ ] Aucune dépendance GPL/AGPL (sortie de `license-checker` jointe)
- [ ] `<ZugBoard />` basé sur react-chessboard, utilisé partout, avec les pièces cburnett et l'attribution
- [ ] Un nouvel onboarding de 3 à 5 positions vérifiées, jouables sans compte
- [ ] Une direction graphique choisie et appliquée, avec les tokens et le mode sombre
- [ ] Gamification V1 : ZugElo, Zug Rush, défi du jour avec partage, précision contre la tablebase, ligues hebdomadaires, clubs et amis, séries, avec les scores validés côté serveur
- [ ] Un modèle de données prêt pour les duels (V2)
- [ ] Des captures Playwright **avant / après** (mobile et desktop) dans `docs/screenshots/`
- [ ] `docs/CHANGELOG-refonte.md` : ce qui a changé, ce qui reste à faire, et les positions à faire relire
