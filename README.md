# Supporter v5 — Backend API (Express.js + TypeScript + Turso/libSQL)

## 🚀 Démarrage rapide

```bash
npm install
npm run dev
```

Le serveur démarre sur le port **3000** et se connecte a la base Turso via `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`.

---

## 📖 Routes Publiques (GET — Lectures seules)

### Rencontres
```
GET /api/rencontres?limit=20&page=1&saison=2004-2005&sort=DATE&order=desc&search=comment
GET /api/rencontres/:id
```

### Joueurs (registre général)
```
GET /api/joueurs?limit=20&search=Mbappé&poste=4
GET /api/joueurs/:id
```

### Statistiques (par saison)
```
GET /api/stats?saison=2004-2005&idjoueur=0001
GET /api/stats/:id
```

### Autres entités (même pattern)
- `/api/matchs`, `/api/equipes`, `/api/saisons`, `/api/tours`, `/api/clubs`

### Pagination & Filtrage
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

## 📝 Routes Admin (JWT requis — `/api/admin/*`)

### CRUD par entité (ex: rencontres, joueurs, stats, matchs, equipes, saisons, tours, clubs)

```
POST   /api/admin/{entité}              # Créer
GET    /api/admin/{entité}/:id          # Lire
PUT    /api/admin/{entité}/:id          # Mettre à jour
DELETE /api/admin/{entité}/:id          # Supprimer

PATCH  /api/admin/{entité}/bulk         # Bulk Update
DELETE /api/admin/{entité}/bulk         # Bulk Delete
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
      database.ts         # Client Turso/libSQL + helpers (dbAll, dbGet, dbRun)
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
| `TURSO_DATABASE_URL` | — | URL libSQL de la base Turso |
| `TURSO_AUTH_TOKEN` | — | Token d'authentification Turso |
| `ADMIN_USERNAME` | — | Nom d'utilisateur (ex: `admin`) |
| `ADMIN_PASSWORD_HASH` | — | Hash bcrypt du mot de passe |
| `JWT_SECRET` | — | Clé secrète JWT (min 32 chars) |
| `JWT_EXPIRES_IN` | `8h` | Durée du token (ex: `8h`, `7d`) |
| `CORS_ORIGINS` | `http://localhost:5173` | Origines autorisées (`,` séparé) |

---

## 🔐 Sécurité

- **Zéro ORM lourd** — SQL brut via client `@libsql/client` (Turso)
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

## 🚀 Déploiement (Render.com + Turso)

1. Créer un Web Service sur Render.com lié au repo Git
2. Définir les env vars (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`)
4. Git push → déploiement automatique

**Important** : Le backend n'utilise plus de fichier SQLite local en production.

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
