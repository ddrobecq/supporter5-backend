# Supporter v5 — Backend API (Express.js + TypeScript + SQLite)

## 🚀 Démarrage rapide

```bash
npm install
npm run dev
```

Le serveur démarre sur le port **3000** et se connecte a la base SQLite via `SQLITE_DB_PATH`.

---

## 📖 Routes publiques

### Health check
```
GET /health
```

### Auth
```
POST /api/auth/login
```

### Lecture (GET)
```
GET /api/rencontres
GET /api/rencontres/:id
GET /api/rencontres/calendar

GET /api/joueurs
GET /api/joueurs/:id
GET /api/joueurs/grid
GET /api/joueurs/postes
GET /api/joueurs/suggest
GET /api/joueurs/:id/history

GET /api/clubs
GET /api/clubs/:id
GET /api/clubs/grid
GET /api/clubs/grid/:id
GET /api/clubs/grid/:id/profile
GET /api/clubs/grid/:id/names-history
GET /api/clubs/grid/:id/terrains-history
GET /api/clubs/suggest

GET /api/arbitre
GET /api/arbitre/:id
GET /api/arbitre/suggest

GET /api/epreuves
GET /api/epreuves/:id
GET /api/epreuves/suggest

GET /api/stats
GET /api/stats/:id
GET /api/matchs
GET /api/matchs/:id
GET /api/equipes
GET /api/equipes/:id
GET /api/saisons
GET /api/saisons/:id
GET /api/tours
GET /api/tours/:id
GET /api/natio
GET /api/natio/:id
GET /api/ville
GET /api/ville/:id
GET /api/terrains
GET /api/terrains/:id
GET /api/devises
GET /api/devises/:id
GET /api/circs
GET /api/circs/:id

GET /api/images/:entity/:id
```

### Ecriture exposée hors /api/admin
```
POST   /api/terrains
PUT    /api/terrains/:id
DELETE /api/terrains/:id
```
Ces routes exigent aussi un JWT (`Authorization: Bearer ...`).

### Pagination, tri, recherche
```
?limit=50           # Par défaut 20, max 200
?page=2             # Par défaut 1
?sort=BUTTOTAL      # Colonne pour tri (liste blanche)
?order=desc         # "asc" (défaut) ou "desc"
?search=texte       # LIKE sur colonnes configurées
?saison=2004-2005   # Filtre exact (colonne selon config)
```

---

## 🔐 Authentification Admin (JWT)

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Retour :
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

### 2. Utiliser le token pour les routes admin
```bash
curl -X POST http://localhost:3000/api/admin/rencontres \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"DOMICILE":"0001",...}'
```

### 3. Changer le mot de passe admin (generer un hash)

Important: la commande doit etre lancee dans le dossier `back` (sinon erreur `Cannot find module 'bcryptjs'`).

Depuis la racine du projet, utilise cette commande PowerShell:

```powershell
Set-Location -Path ".\\back"
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync(process.argv[1], 12));" "NOUVEAU_MOT_DE_PASSE"
```

Ou, si tu es deja dans `back`:

```powershell
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync(process.argv[1], 12));" "NOUVEAU_MOT_DE_PASSE"
```

Option (evite d'afficher le mot de passe en clair dans l'historique):

```powershell
$pwd = Read-Host "Nouveau mot de passe"
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync(process.argv[1], 12));" "$pwd"
```

Copier le hash obtenu dans `.env`:

```env
ADMIN_PASSWORD_HASH=<LE_HASH_GENERE>
```

Puis redemarrer le backend.

---

## 📝 Routes admin (JWT requis — `/api/admin/*`)

### CRUD admin générique par entité

Routes disponibles pour:
- `/api/admin/rencontres`
- `/api/admin/joueurs`
- `/api/admin/stats`
- `/api/admin/matchs`
- `/api/admin/equipes`
- `/api/admin/saisons`
- `/api/admin/tours`
- `/api/admin/clubs`
- `/api/admin/natio`
- `/api/admin/ville`
- `/api/admin/arbitre`
- `/api/admin/terrains`
- `/api/admin/devises`
- `/api/admin/circs`
- `/api/admin/epreuves`

Pattern commun:
```
POST   /api/admin/{entite}
PUT    /api/admin/{entite}/:id
DELETE /api/admin/{entite}/:id

PATCH  /api/admin/{entite}/bulk
DELETE /api/admin/{entite}/bulk
```

Note: les lectures `GET` passent par les routes publiques `/api/...`.

### Endpoints admin spécifiques
```
GET    /api/admin/{entite}/:id/can-delete

POST   /api/admin/joueurs/wizard-create
POST   /api/admin/joueurs/:id/history
PUT    /api/admin/joueurs/:id/history/:historyId
DELETE /api/admin/joueurs/:id/history/:historyId

POST   /api/admin/clubs/wizard-create
PUT    /api/admin/clubs/:id/profile
PUT    /api/admin/clubs/:id/colors
POST   /api/admin/clubs/:id/names
PUT    /api/admin/clubs/:id/names/:nameId
DELETE /api/admin/clubs/:id/names/:nameId
POST   /api/admin/clubs/:id/terrains
PUT    /api/admin/clubs/:id/terrains/:terrainId
DELETE /api/admin/clubs/:id/terrains/:terrainId

POST   /api/admin/arbitre/wizard-create
POST   /api/admin/epreuves/wizard-create
```

### Exemples

**Créer une rencontre** (POST)
```bash
POST /api/admin/rencontres
{
  "DOMICILE":"0001",
  "EXTERIEUR":"0002",
  "DATE":"2025-01-15",
  "BUTDOM":2,
  "BUTEXT":1,
  "TABDOM":0,
  "TABEXT":0,
  "HEURE":"20:00:00",
  "SAISON":"2024-2025"
}
```

**Bulk Update** (PATCH)
```bash
PATCH /api/admin/rencontres/bulk
{
  "ids": ["RECLEUNIK1", "RECLEUNIK2"],
  "data": {"ETAT":3}
}
```

**Bulk Delete** (DELETE)
```bash
DELETE /api/admin/rencontres/bulk
{
  "ids": ["RECLEUNIK1", "RECLEUNIK2"]
}
```

---

## 🛠️ Scripts npm

```bash
npm run dev         # Démarrer en développement (tsx watch)
npm run build       # Compiler TypeScript vers dist/
npm start           # Lancer depuis dist/
npm run typecheck   # Vérifier les types sans build
```

---

## 🗄️ Structure du projet

```
back/
  src/
    config/
      database.ts         # Connexion SQLite + helpers (dbAll, dbGet, dbRun)
    lib/
      baseService.ts      # Factory pour CRUD + bulk ops
      controllerFactory.ts # Factory pour controllers génériques
      queryBuilder.ts     # Sanitization + WHERE builder
    middlewares/
      auth.middleware.ts  # Vérification JWT
      error.middleware.ts # Handler global d'erreurs
    types/
      index.ts            # Types TypeScript (QueryParams, JwtPayload, etc.)
    routes/
      auth.routes.ts      # POST /auth/login
      *.routes.ts         # Routes publiques (GET)
      admin/
        *.admin.routes.ts # Routes admin (POST, PUT, PATCH, DELETE)
        index.ts          # Agrégateur + auth middleware
    services/
      auth.service.ts     # login(username, password) → JWT
      *.service.ts        # Entités (rencontres, joueurs, etc.)
    controllers/
      auth.controller.ts  # Handlers pour auth
      *.controller.ts     # Handlers CRUD pour entités
    app.ts              # Express app avec middlewares
  src/server.ts       # Entry point (listen)
  package.json        # Dépendances
  tsconfig.json       # Config TypeScript
  .env                # Env vars (dev)
  .env.example        # Template pour .env
  .gitignore
```

---

## 🔑 Variables d'environnement

| Var | Défaut | Description |
|-----|--------|-------------|
| `NODE_ENV` | `development` | `production` ou `development` |
| `PORT` | `3000` | Port du serveur |
| `SQLITE_DB_PATH` | `./data/supporter.sqlite` | Chemin du fichier SQLite |
| `SQLITE_UPLOAD_MAX_MB` | `512` | Taille max de l upload SQLite admin (MB) |
| `SQLITE_UPLOAD_TMP_DIR` | system tmp | Dossier temporaire pour l upload SQLite |
| `ADMIN_USERNAME` | — | Nom d'utilisateur (ex: `admin`) |
| `ADMIN_PASSWORD_HASH` | — | Hash bcrypt du mot de passe |
| `JWT_SECRET` | — | Clé secrète JWT (min 32 chars) |
| `JWT_EXPIRES_IN` | `8h` | Durée du token (ex: `8h`, `7d`) |
| `CORS_ORIGINS` | `http://localhost:5173` | Origines autorisées (`,` séparé) |
| `PUBLIC_SITE_URL` | `https://votre-domaine.com` | Origine publique utilisée par `/sitemap.xml` |

---

## 🔐 Sécurité

- **Zéro ORM lourd** — SQL brut via `better-sqlite3` (SQLite)
- **Injection SQL prévenue** — Paramètres liés + whitelist pour tri/filtres
- **JWT pour l'authentification** — Un seul compte admin via `.env`
- **CORS + Helmet** — Protection contre les attaques courantes
- **Rate limiting** — 10 tentatives de login par 15 min
- **Gestion globale d'erreurs** — HTTP status codes appropriés

---

## 📊 Opérations en masse

```bash
# Bulk Update : modifier plusieurs enregistrements
PATCH /api/admin/rencontres/bulk
{ "ids": ["123", "456"], "data": { "ETAT": 3 } }

# Bulk Delete : supprimer plusieurs enregistrements
DELETE /api/admin/rencontres/bulk
{ "ids": ["123", "456"] }
```

---

## 🚀 Déploiement (Render.com + SQLite)

1. Créer un Web Service sur Render.com lié au repo Git
2. Définir les env vars (`SQLITE_DB_PATH`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`)
4. Git push → déploiement automatique

**Important** : Le backend utilise un fichier SQLite.

- Sans disque persistant Render: utiliser `SQLITE_DB_PATH=./data/supporter.sqlite`.
  La base sera recréée à chaque redéploiement/redémarrage (stockage éphémère).
- Avec disque persistant Render (recommandé):
  1. Ajouter un Persistent Disk dans Render (ex: mount path `/var/data`)
  2. Définir `SQLITE_DB_PATH=/var/data/supporter.sqlite`

Le backend crée automatiquement le dossier parent du fichier SQLite au démarrage.

---

## 🧪 Tests (Bruno/Postman)

Une collection Bruno sera créée dans l'étape suivante pour tester :
- ✅ Login et obtenir JWT
- ✅ GET avec pagination/filtrage/tri
- ✅ POST créer entité
- ✅ PUT modifier entité
- ✅ DELETE supprimer entité
- ✅ PATCH bulk update
- ✅ DELETE bulk delete
- ✅ Erreurs (401, 404, 400)
