# Planning 30 Ans - Calendrier de Disponibilités Partagé

Ce projet est une application web statique, moderne et épurée, conçue pour aider un groupe de copains à planifier un week-end ou une journée pour fêter un 30ème anniversaire. 

L'application affiche en simultané la période de **Août 2026 à Novembre 2026** et permet à chaque participant de renseigner ses disponibilités en temps réel. Le stockage des données est décentralisé grâce à un bucket JSON gratuit en ligne, ce qui rend l'application entièrement autonome et hébergeable gratuitement sur **GitHub Pages**.

## Fonctionnalités clés

- **Visualisation globale** : Les 4 mois sont visibles sur la même page (grille adaptative).
- **Gestion des profils** : Identification initiale pour sélectionner un profil existant ou en créer un nouveau.
- **Saisie interactive** : Clic sur n'importe quel jour pour changer son état (Disponible, Peut-être, Indisponible, Non renseigné).
- **Indicateurs visuels (Heatmap)** : Chaque cellule affiche des pastilles de couleur représentant les réponses des autres amis.
- **Détails au survol** : Passer la souris sur un jour affiche l'état exact de chaque participant.
- **Meilleures dates** : Calcul en direct des 5 meilleures dates réunissant le plus grand nombre de copains (1 point pour "Disponible", 0,5 point pour "Peut-être").

---

## Fonctionnement Technique (Sans Serveur)

L'application utilise l'API de stockage de **[ExtendsClass](https://extendsclass.com/)** pour sauvegarder et charger le planning de groupe sous format JSON. 

- **Endpoint de données** : `https://json.extendsclass.com/bin/cbdfbdc`
- **Sauvegarde locale** : En cas de perte de connexion, une copie des données est sauvegardée dans le `localStorage` de votre navigateur.

---

## Comment tester localement ?

Puisque l'application utilise l'API fetch (requêtes HTTP asynchrones) et des modules JavaScript standard, il est conseillé de l'ouvrir via un serveur local plutôt que d'ouvrir le fichier `.html` directement.

### Option 1 : Via VS Code (Recommandé)
1. Installez l'extension **Live Server**.
2. Ouvrez le dossier dans VS Code.
3. Cliquez sur **Go Live** en bas à droite de la fenêtre.

### Option 2 : Via Python
Si Python est installé sur votre machine, ouvrez votre terminal dans ce dossier et lancez :
```bash
python -m http.server 8000
```
Puis accédez à `http://localhost:8000`.

### Option 3 : Via Node.js (npm)
Vous pouvez utiliser `live-server` :
```bash
npx live-server
```

---

## Comment héberger sur GitHub Pages ?

L'hébergement sur **GitHub Pages** est gratuit et prend moins de 2 minutes :

1. Créez un nouveau dépôt public sur votre compte GitHub (ex: `planning-30-ans`).
2. Poussez les fichiers de ce projet (`index.html`, `style.css`, `app.js`) sur la branche principale (`main` ou `master`) de votre dépôt.
3. Sur GitHub, allez dans les **Settings** (Paramètres) de votre dépôt.
4. Dans le menu de gauche, cliquez sur **Pages** (sous la section "Code and automation").
5. Sous **Build and deployment**, dans la section **Source**, sélectionnez **Deploy from a branch**.
6. Sous **Branch**, sélectionnez votre branche principale (`main` ou `master`), laissez le dossier à la racine (`/root`), puis cliquez sur **Save**.
7. Après quelques secondes, GitHub vous fournira l'URL publique de votre site (ex: `https://votre-pseudo.github.io/planning-30-ans/`).
