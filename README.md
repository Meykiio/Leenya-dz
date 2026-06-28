# Leenya — File d'attente & Rendez-vous

**Leenya** est une plateforme SaaS de gestion de files d'attente et de rendez-vous pour les commerces de service algériens (salons, cliniques, barbiers, etc.).

---

## Fonctionnalités

- **🌐 i18n multilingue** — Français, Arabe, Anglais. ~590 clés par langue. Interface RTL pour l'arabe.
- **Page publique** — Infos du commerce, horaires, réservation ou file d'attente.
- **Rendez-vous en ligne** — Service, personnel (optionnel), créneau, confirmation WhatsApp.
- **File d'attente** — Ticket en temps réel, position, ETA, statut.
- **Tableau de bord propriétaire** — Réservations (filtres, Accept/Refuse, WhatsApp), file en temps réel, CRUD services/personnel, paramètres, analytiques.
- **Abonnements** — 3 paliers (Gratuit/Pro/Business) avec limites appliquées côté serveur + période d'essai de 30 jours.
- **Personnel** — Vue simplifiée avec connexion email/mot de passe.
- **Modèles WhatsApp** — 7 types personnalisables.
- **Écran TV** — Affichage plein écran de la file d'attente.
- **Page client** — Historique, annulation, avis.

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS v3 + shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Formulaires | React Hook Form + Zod |
| Graphiques | Recharts |
| Animations | Framer Motion |
| i18n | react-i18next (6 namespaces × 3 langues) |
| Monitoring | Sentry |
| Tests | Vitest (unitaires) + Playwright (E2E) |
| CI/CD | GitHub Actions |
| Polices | Sora, JetBrains Mono, IBM Plex Sans Arabic |

---

## Structure du projet

```
src/
├── components/
│   ├── auth/           — Connexion, inscription, mot de passe oublié
│   ├── booking/        — Flux rendez-vous, file d'attente, suivi ticket
│   ├── dashboard/      — Layout, analytiques, onglets paramètres
│   ├── landing/        — Page d'accueil marketing
│   ├── onboarding/     — Wizard de configuration du commerce
│   └── ui/             — Composants shadcn/ui
├── contexts/           — AuthContext (session, rôle)
├── hooks/              — Hooks personnalisés
├── lib/                — Utilitaires (créneaux, WhatsApp, wilayas, avatar)
├── pages/
│   ├── dashboard/
│   │   ├── bookings/   — Réservations (PendingApprovals, filtres)
│   │   ├── queue/      — File d'attente (listes, dialogues)
│   │   ├── staff/      — Personnel (carte, formulaire, affectation services)
│   │   └── whatsapp/   — Modèles WhatsApp (édition, aperçu)
│   └── *.tsx           — Pages principales
└── test/               — Tests Vitest
```

---

## Premiers pas

### Prérequis

- Node.js 18+
- npm ou bun
- Un projet Supabase (gratuit)

### Installation

```sh
git clone <votre-repo>
cd leenya
npm install
```

### Variables d'environnement

Créez un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://<projet>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé-anonyme>
VITE_SUPABASE_PROJECT_ID=<ref-projet>
```

### Base de données

Exécutez `supabase/schema/MASTER_SCHEMA.sql` dans l'éditeur SQL de votre projet Supabase. Ce fichier contient toutes les tables, index, politiques RLS, triggers et fonctions — source de vérité unique.

### Développement

```sh
npm run dev          # Serveur de développement (http://localhost:5173)
npm run build        # Build de production
npx tsc --noEmit     # Vérification TypeScript uniquement
npx vitest run       # Tests unitaires
npx playwright test  # Tests E2E
```

---

## Documentation

Toute la documentation du projet se trouve dans le dossier `DOCS/` :

| Fichier | Contenu |
|---------|---------|
| `AI_CONTEXT.md` | Vue d'ensemble complète pour IA — fichier map, DB, design, sessions |
| `ARCHITECTURE.md` | Stack, structure, data flow, auth, routing, schéma |
| `CLAUDE.md` | Onboarding rapide pour nouveaux développeurs/IA |
| `DESIGN.md` | Design system couleurs, typographie, spacing, composants |
| `ENVIRONMENT.md` | Setup, variables d'env, checklist Supabase |
| `FEATURES.md` | Toutes les fonctionnalités — statut, fichiers, notes |
| `NEXT.md` | Prochaines étapes par priorité (P0 → P5) |
| `PROJECT_STATUS.md` | % achèvement par domaine, flows, tech debt |
| `SYSTEM_INSTRUCTIONS.md` | Conventions, règles, build, DB, AI behavior |

---

## Contact

Support WhatsApp : configurable via `VITE_SUPPORT_PHONE` (fallback `213770000000`)
Email : sifeddine.meb96@gmail.com

## Licence

Projet privé — Tous droits réservés.
