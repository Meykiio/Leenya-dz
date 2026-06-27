# Leenya — Audit de sécurité final

**Score : 7.5 / 10**

## Résolu (Phase 2a, 2b, 2c)

| ID | Titre | Sévérité | Statut |
|---|---|---|---|
| C-001 | Accès direct aux tables via API REST (RLS absente) | Critique | ✅ Corrigé |
| C-002 | Injection SQL via `search_path` mutable | Critique | ✅ Corrigé |
| C-003 | Création de comptes sans vérification | Critique | ✅ Corrigé |
| C-004 | `.env` dans l'historique git | Critique | ✅ Non applicable (jamais commité) |
| H-001 | Accès aux fonctions privées depuis le client | Haut | ✅ Corrigé |
| H-002 | Fuite de clés API (durcies) | Haut | ✅ Corrigé |
| H-003 | Pas de validation des données entrantes | Haut | ✅ Corrigé |
| H-004 | GRANT EXECUTE sur toutes les fonctions | Haut | ✅ Corrigé |
| H-005 | RLS absente sur `services`, `staff_members`, `bookings` | Haut | ✅ Corrigé |
| H-006 | `search_path` mutable (25 fonctions) | Haut | ✅ Corrigé |
| H-007 | Trigger manquant — heures d'ouverture (1/3) | Haut | ✅ Corrigé |
| H-008 | Trigger manquant — machine à états (2/3) | Haut | ✅ Corrigé |
| H-009 | Trigger manquant — réservations passées (3/3) | Haut | ✅ Corrigé |
| H-010 | Liste des buckets de stockage exposée | Haut | ✅ Corrigé |
| H-011 | Protection mots de passe leakés | Haut | ⏳ Manuel (dashboard Supabase) |
| ARC-04 | Requêtes non filtrées par `business_id` | Haut | ✅ Corrigé (11 requêtes) |
| SEC-01 | Fuite d'erreurs internes (messages)` | Haut | ✅ Corrigé (32 fuites) |

## Restant (Phase 2d+)

| Catégorie | Détail | Priorité |
|---|---|---|
| Monitoring | ✅ Sentry intégré (DSN requis) | Moyenne |
| CI/CD | ✅ GitHub Actions (lint + test + build) | Moyenne |
| E2E | ✅ Playwright (booking + queue + staff) | Moyenne |
| CSP | ✅ En-têtes configurés (dev + prod) | Moyenne |
| RLS tests | ✅ Tests d'intégration SQL | Moyenne |
| npm vulns | ✅ 0 vulnérabilités | Haute |
| Rate limiting | Limite au niveau DB (trigger) | Faible |
| RESTRICTIVE RLS | Audit `TO anon` / `TO authenticated` | Faible |

## Notes

- Score : 7.5/10. Tous les éléments critiques et hauts sont résolus.
- Le seul élément H restant (H-011) est un toggle manuel dans le dashboard Supabase.
- Voir `supabase/tests/rls_policies.sql` pour les tests d'intégration RLS.
- Les workflows CI/CD sont dans `.github/workflows/`.
- Les tests E2E Playwright sont dans `e2e/`.
- Le monitoring Sentry est activé via `VITE_SENTRY_DSN` (secret GitHub).
