# Plan : Étape 2 — Backend API Node.js/TypeScript

## Contexte
- DB migree vers Turso (`libsql://supporter-ddrobecq.aws-eu-west-1.turso.io`)
- Back/ vide (seulement `dev_backend.agent.md`)
- Décisions : **TypeScript**, toutes les tables en lecture publique, **1 compte admin via .env**

## Structure cible
```
back/
  src/
    config/database.ts
    routes/index.ts + (joueurs|matchs|rencontres|clubs|saisons|tours|arbitres|equipes|news|auth).routes.ts
    controllers/*.controller.ts
    services/*.service.ts
    middlewares/auth.middleware.ts + error.middleware.ts
    types/index.ts
  app.ts
  server.ts
  package.json
  tsconfig.json
  .env + .env.example
  .gitignore
```

## Tables à exposer (issues des CSV)
- JOUEUR (stats joueurs/saison) — clé JOCLEUNIK
- MATCH (détails match) — clé MACLEUNIK
- RENCO (rencontres/résultats) — clé RECLEUNIK
- EQUIPE (compositions) — clé EQCLEUNIK
- SAISON — clé SAISON
- TOUR — clé TDCLEUNIK
- ARBITRE — clé IDARBITRE
- CLUB, CLUB_NOM, TERRAIN, VILLE, NATIO
- NEWS, TROPHEE, VIDEO, TRANSAC

## Plan détaillé

### Phase 1 — Init & Infrastructure (base)
1. Créer `back/package.json` (express, @libsql/client, jsonwebtoken, bcryptjs, cors, helmet, dotenv)
2. Créer `back/tsconfig.json`
3. Créer `src/config/database.ts` — client Turso/libSQL via env (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)
4. Créer `app.ts` (express init, cors, helmet, json parser, routes)
5. Créer `server.ts` (listen sur PORT)
6. Créer `src/middlewares/error.middleware.ts` — handler global 400/401/403/500
7. Créer `src/types/index.ts` — types QueryParams, PaginatedResult, etc.
8. Créer `.env.example`, `.gitignore`

### Phase 2 — Authentification
9. Créer `src/services/auth.service.ts` — compare ADMIN_USERNAME/ADMIN_PASSWORD_HASH env → génère JWT
10. Créer `src/controllers/auth.controller.ts` — POST /api/auth/login
11. Créer `src/routes/auth.routes.ts`
12. Créer `src/middlewares/auth.middleware.ts` — vérification JWT Bearer

### Phase 3 — Routes publiques (lecture seule, pattern répété)
Pattern par entité : service (SQL préparé, pagination/tri/recherche) → controller → route
13. RENCO (rencontres) — la plus utile pour le site public
14. JOUEUR (joueurs)
15. MATCH (matchs)
16. EQUIPE (compositions)
17. SAISON, TOUR
18. CLUB, ARBITRE
19. NEWS, TROPHEE, VIDEO (entités secondaires)
Agrégation dans `src/routes/index.ts`

### Phase 4 — Routes admin (JWT protégées, Bulk)
Pattern par entité : POST, PUT /:id, PATCH /bulk, DELETE /:id, DELETE /bulk
20. Admin CRUD RENCO + Bulk
21. Admin CRUD JOUEUR + Bulk
22. Admin CRUD MATCH + Bulk
23. Répéter pour les autres entités

### Phase 5 — Validation & Tests
24. Tester toutes les routes avec Bruno/Postman (collection à créer)
25. Vérifier latence API + connexion Turso dans la region cible

## Dépendances runtime
express, @libsql/client, jsonwebtoken, bcryptjs, cors, helmet, dotenv

## Dépendances dev
typescript, @types/express, @types/jsonwebtoken, @types/bcryptjs, @types/cors, @types/node, tsx, ts-node

## Variables d'environnement (.env)
- NODE_ENV
- PORT
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
- ADMIN_USERNAME
- ADMIN_PASSWORD_HASH (bcrypt hash)
- JWT_SECRET
- JWT_EXPIRES_IN
