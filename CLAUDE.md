## Délégation
- Tâches sur le site public et les composants React courants : délègue à l'agent expert-front-spa.
- Tâches sur l'interface d'administration (grilles, édition en ligne, actions par lot) : délègue à expert-admin-desktop.
- Tâches API, base de données et sécurité : délègue à expert-backend.

## Backend
- Accès base SQLite via `better-sqlite3` (synchrone), SQL brut, pas d'ORM.
- Variables d'environnement : `SQLITE_DB_PATH`, `JWT_SECRET`, `PORT`.
- Routes de modification en masse (Bulk Update, Bulk Delete) acceptant des tableaux d'identifiants.
