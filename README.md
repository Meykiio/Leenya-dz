# Leenya — File d'attente & Rendez-vous

**Leenya** est une plateforme SaaS de gestion de files d'attente et de rendez-vous pour les commerces de service algériens (salons, cliniques, barbiers, etc.).

---

## Fonctionnalités

- **Page publique** — Les clients voient les infos du commerce, les horaires, et choisissent entre prendre un rendez-vous ou rejoindre la file d'attente.
- **Rendez-vous en ligne** — Sélection du service, du membre du personnel (optionnel), date/créneau, coordonnées. Lien WhatsApp de confirmation.
- **File d'attente** — Ticket en temps réel avec position, estimation d'attente, statut (en attente → appelé → en cours → terminé).
- **Tableau de bord propriétaire** — Vue d'ensemble, gestion des réservations (filtres, Accept/Refuse, actions WhatsApp), gestion de la file en temps réel, CRUD services/personnel, paramètres, analytiques.
- **Personnel** — Vue simplifiée de la file avec actions Appeler/Compléter/No-show.
- **Modèles WhatsApp** — 7 types de messages personnalisables (confirmation, rappel, acceptation, etc.).
- **Écran TV** — Affichage plein écran de la file d'attente pour la salle d'attente.
- **Page client** — Historique des réservations, annulation, avis.

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

Exécutez `supabase/schema/MASTER_SCHEMA.sql` dans l'éditeur SQL de votre projet Supabase. Ce fichier contient toutes les tables, index, politiques RLS, triggers et fonctions — c'est la source de vérité unique.

### Développement

```sh
npm run dev          # Serveur de développement (http://localhost:5173)
npm run build        # Build de production
npx tsc --noEmit     # Vérification TypeScript uniquement
```

---

## Licence

Projet privé — Tous droits réservés.
