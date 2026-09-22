# FieldVisit Web

A **React + TypeScript + Firebase** web dashboard companion to the FieldVisit Android app -- built for medical field-sales teams to log, view, filter, and export doctor/clinic visit records.

---

## Features

### Employee dashboard
- View your own visits with **real-time Firestore sync** (page 1) + **cursor-based Load More** pagination
- **Sort** by: Newest, Oldest, Purpose, Clinic/Hospital
- **Filter** by: Purpose (dropdown), Date range, Clinic name (text) -- all combinable
- **Search** free-text across doctor name, clinic, notes, address
- Log new visits via the floating + button (GPS, purpose, contact details, notes, follow-up date)
- **Edit** any visit within 24 hours of creation
- **Export CSV** of all loaded visits

### Manager dashboard
- View **all employees visits** across the organisation
- Same sort + filter controls, plus an **Employee dropdown** (filter by individual employee)
- Stats header showing total visits and unique employees

---

## Tech stack

| Layer | Technology |
|-------|----------|
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Build | Vite 8 |
| Backend | Firebase (Auth + Firestore + Hosting) |
| Maps | Google Maps JavaScript API + Geocoding API |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/FieldVisit-Web.git
cd FieldVisit-Web
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your Firebase project credentials and Google Maps API key.
**Never commit `.env` -- it is gitignored.**

- **Firebase credentials**: Firebase Console > Project Settings > Your apps > Web app > SDK setup
- **Google Maps key**: https://console.cloud.google.com/apis/credentials -- enable Maps JavaScript API + Geocoding API

### 3. Set up Firebase

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

Deploy Firestore rules and indexes:

```bash
firebase deploy --only firestore
```

> Indexes take a few minutes to build after first deploy.

### 4. Run locally

```bash
npm run dev
```

### 5. Build and deploy

```bash
npm run build
firebase deploy --only hosting
```

---

## Project structure

```
src/
  components/      # Shared UI (NavBar, VisitCard, FilterPanel ...)
  firebase/        # Firebase init -- reads config from .env
  hooks/           # useAuth, useVisits, useEmployees
  pages/
    employee/      # DashboardPage, VisitDetailPage
    manager/       # DashboardPage, ExportPage
    auth/          # LoginPage, RegisterPage
  services/        # visits.service.ts -- all Firestore query logic
  types/           # Shared TypeScript types
  utils/           # CSV export, error formatting, helpers
firestore.rules
firestore.indexes.json
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `firebase deploy --only firestore` | Deploy rules + indexes |
| `firebase deploy --only hosting` | Deploy built dist/ |
| `firebase deploy` | Deploy everything |
