# MORIS — Les Bâtisseurs de l'Île

Jeu de plateau de colonisation en version numérique, sur le thème de l'île Maurice. Chaque joueur bâtit des Pirogues, des Campements et des Cottages Créoles, récolte des ressources, fait du commerce et affronte ses adversaires. **Le premier à 10 points de victoire pendant son tour gagne.**

**Jouer en ligne : https://settle-forge-ai.lovable.app**

## Le jeu

- Plateau hexagonal de 19 terrains, avec ports et Curepipe Monkey (le voleur).
- 5 ressources : Sucre, Basalte, Thé, Ananas/Zépis et Poisson.
- Construction : Pirogues (routes), Campements (1 PV), Cottages Créoles (2 PV).
- Commerce avec la banque, les ports et les autres joueurs.
- Cartes Sirandane (développement) et titres spéciaux : Pirogue la plus Longue et Armée de Ravanne (2 PV chacun).
- Robots : ils jouent leur tour seuls et répondent aux offres d'échange.
- Journal de partie : l'historique de chaque action.

## Modes de jeu

- 4 joueurs humains sur le même écran
- 2 humains + 2 robots
- 1 humain + 3 robots
- 4 robots (spectateur)

## Installation en local

Il faut [Node.js](https://nodejs.org) (version LTS) et Git.

```sh
git clone https://github.com/jamescarter26/settle-forge-ai.git
cd settle-forge-ai
npm install
npm run dev
```

Le jeu s'ouvre à l'adresse affichée dans le terminal (par exemple `http://localhost:5173`).

Pour créer une version de production : `npm run build` (le résultat est dans le dossier `dist/`).

## Technologies

React, TypeScript, Vite, Tailwind CSS. Le moteur de règles est séparé de l'interface pour que les humains et les robots utilisent exactement les mêmes actions.

## Avancement

Projet en cours de développement. Les 20 parties de test entre robots se terminent normalement ; les boutons de construction, d'échange et de cartes restent à tester à la main. Le mode multijoueur en ligne n'est pas encore disponible.

## Crédits

Conçu et développé par Roshand Bhantooa. Créé avec [Lovable](https://lovable.dev).

MORIS est un jeu original inspiré des jeux de colonisation classiques. Ce projet n'est affilié à aucune marque ni éditeur existant.

## Licence

À définir (par exemple MIT pour le code). Sans licence, tous droits sont réservés par défaut.
