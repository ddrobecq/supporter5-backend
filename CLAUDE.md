## Délégation
- Tâches sur le site public et les composants React courants : délègue à l'agent expert-front-spa.
- Tâches sur l'interface d'administration (grilles, édition en ligne, actions par lot) : délègue à expert-admin-desktop.
- Tâches API, base de données et sécurité : délègue à expert-backend.

## Backend
- Accès base SQLite via `better-sqlite3` (synchrone), SQL brut, pas d'ORM.
- Variables d'environnement : `SQLITE_DB_PATH`, `JWT_SECRET`, `PORT`.
- Pas de routes de modification en masse (bulk) : une écriture = un enregistrement.
- Le back enregistre ce qu'il reçoit : il valide (400 format, 422 règle métier, 409 conflit) et ne réécrit jamais une valeur ; les valeurs par défaut sont proposées par le front.
- Pagination des listes : `page` (≥ 1) et `pageSize` (1–500, défaut 100).
