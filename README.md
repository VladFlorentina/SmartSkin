# CosmetiSafe — Smart Cosmetic Analyzer

> Aplicație mobilă pentru analiza toxicității produselor cosmetice, construită cu React Native și inteligență artificială.

**Proiect de licență** — Vlad Florentina, 2025/2026

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-54-black.svg)](https://expo.dev/)
[![Tests](https://img.shields.io/badge/Tests-45_passed-brightgreen.svg)](#teste)

---

## Descărcare aplicație

**[📲 Descarcă CosmetiSafe pentru Android (APK)](https://expo.dev/accounts/vlad_florentina/projects/smartskin/builds/7b0e96ad-6d26-4021-9ca8-240ceb56b90e)**

> Necesita Android 6.0+. Deschide linkul de pe telefon, descarca APK-ul si instaleaza-l.

---

## Cuprins

- [Descrierea proiectului](#descrierea-proiectului)
- [Funcționalități](#funcționalități)
- [Arhitectura sistemului](#arhitectura-sistemului)
- [Stack tehnologic](#stack-tehnologic)
- [Baza de date CosIng](#baza-de-date-cosing)
- [Algoritmul de evaluare a toxicității](#algoritmul-de-evaluare-a-toxicității)
- [Structura proiectului](#structura-proiectului)
- [Instalare și rulare locală](#instalare-și-rulare-locală)
- [Teste](#teste)
- [API — Documentație](#api--documentație)
- [Licență](#licență)

---

## Descrierea proiectului

CosmetiSafe este o aplicație mobilă care permite utilizatorilor să scaneze codul de bare al unui produs cosmetic pentru a afla rapid dacă ingredientele sunt sigure sau nu. Aplicația interpretează lista INCI (International Nomenclature of Cosmetic Ingredients) folosind baza de date oficială **CosIng** a Comisiei Europene și un algoritm propriu de calcul al riscului chimic.

Dacă produsul nu se găsește în bazele de date existente, utilizatorul poate fotografia eticheta direct din aplicație. Modelul de inteligență artificială **Google Gemini** extrage automat lista de ingrediente INCI și o analizează.

### Problemă rezolvată

Consumatorii nu dispun de instrumente accesibile pentru a evalua rapid compoziția chimică a produselor cosmetice pe care le achiziționează. Listele de ingrediente INCI sunt dificil de interpretat fără cunoștințe specializate de chimie cosmetică.

### Soluția propusă

O aplicație mobilă care:
- Transformă o listă de ingrediente complexă într-un **scor de siguranță de la 0 la 100**
- Identifică substanțele **interzise**, **restricționate** sau **controversate** conform legislației europene
- Personalizează evaluarea în funcție de **tipul de piele** și **alergiile** fiecărui utilizator
- Oferă un **chatbot AI** care răspunde la întrebări specifice despre ingredientele din produs

---

## Funcționalități

| Funcționalitate | Descriere |
|---|---|
| **Scanare cod de bare** | Scanare în timp real a codurilor EAN-13 / EAN-8 / UPC cu camera telefonului |
| **OCR pe etichetă** | Extragere automată a listei INCI din fotografia etichetei via Google Gemini |
| **Algoritm de scoring** | Scor de siguranță 0–100 bazat pe ~30.000 de ingrediente din baza CosIng a UE |
| **Scor animat** | Indicator vizual de tip ring SVG cu gradare cromatică (verde / galben / roșu) |
| **Personalizare** | Scor adaptat în funcție de tipul de piele (5 tipuri) și alergiile declarate (10 categorii) |
| **CosmetiBot** | Chatbot AI integrat pentru întrebări despre ingrediente și recomandări |
| **Cache comunitar** | Un produs analizat o dată devine disponibil instantaneu pentru toți utilizatorii |
| **Istoric scanări** | Istoricul complet al produselor scanate, cu posibilitatea de comparare |
| **Comparare produse** | Comparare side-by-side a două produse pe baza scorului și ingredientelor |
| **Căutare multi-sursă** | Căutare simultană în baza de date locală, Open Beauty Facts și Makeup API |
| **Panou de administrare** | Gestionarea utilizatorilor, produselor și rapoartelor de la utilizatori |
| **Detecție greenwashing** | Identifică produse cu claim-uri „Natural/Bio" care conțin ingrediente controversate |
| **Suport bilingv** | Interfață completă în română și engleză |
| **Mod Light / Dark** | Teme vizuale cu persistență a preferințelor |
| **Mod Guest** | Acces rapid la scanare fără înregistrare |

---

## Arhitectura sistemului

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT — React Native (Expo)                 │
│  Scanner · Product · Chat · History · Profile · Admin Panel     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / REST (JSON + Base64)
                            │ Authorization: Bearer JWT
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER — Node.js + Express                   │
│                                                                 │
│  ┌─────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │  Controllers │  │   Middleware   │  │      Services       │  │
│  │  ─ Product   │  │  ─ JWT Auth    │  │  ─ toxicityAnalyzer │  │
│  │  ─ AI Chat   │  │  ─ Admin role  │  │  ─ geminiService    │  │
│  │  ─ Admin     │  │  ─ Rate limit  │  │  ─ openBeautyFacts  │  │
│  └─────────────┘  └────────────────┘  │  ─ makeupApiService │  │
│                                        └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
   ┌──────────────┐ ┌──────────────┐ ┌───────────────┐
   │   Supabase   │ │ Google Gemini│ │ Open Beauty   │
   │  PostgreSQL  │ │   AI API     │ │  Facts API    │
   │              │ │              │ │               │
   │ ─ ingredients│ │ ─ OCR (Vis.) │ │ ─ Metadata    │
   │   (~30.000)  │ │ ─ Chatbot    │ │   produse     │
   │ ─ products   │ │ ─ Rezolvare  │ │               │
   │ ─ users      │ │   necunoscute│ └───────────────┘
   │ ─ history    │ └──────────────┘
   │ ─ allergies  │
   └──────────────┘
```

---

## Stack tehnologic

### Frontend

| Tehnologie | Rol |
|---|---|
| React Native + Expo SDK 54 | Framework mobil cross-platform |
| JavaScript (ES Modules) | Limbaj de programare |
| NativeWind (Tailwind CSS v3.3.2) | Stilizare componentelor native |
| React Navigation v7 (Native Stack + Bottom Tabs) | Navigare și rutare |
| expo-camera | Scanare coduri de bare și captură foto OCR |
| expo-image-picker | Selectare imagini din galerie |
| react-native-svg | Grafice SVG (ring scor, diagrame) |
| react-native-markdown-display | Afișare răspunsuri AI formatate |
| lucide-react-native | Iconografie |

### Backend

| Tehnologie | Rol |
|---|---|
| Node.js + Express.js | Server REST API |
| Supabase (PostgreSQL) | Bază de date cloud, autentificare JWT, Row Level Security |
| Google Gemini (dual-model) | OCR pe etichete, rezolvare ingrediente necunoscute, chatbot |
| Open Beauty Facts API | Metadata produse cosmetice (nume, brand, imagine) |
| Makeup API | Căutare produse de machiaj |
| express-rate-limit | Protecție împotriva abuzului pe endpoint-uri |
| Swagger / OpenAPI 3.0 | Documentație interactivă API |
| Jest v30 | Framework de testare unitară |

### Inteligență artificială — Google Gemini

Sistemul utilizează o arhitectură cu **fallback automat** între două modele:

| Prioritate | Model | Utilizare |
|---|---|---|
| Primar | gemini-3-flash-preview | OCR, rezolvare ingrediente, chatbot |
| Secundar | gemini-2.5-flash | Activat automat la erori de rată/disponibilitate |

Timeout de siguranță: **90 de secunde** per cerere AI.

---

## Baza de date CosIng

Ingredientele sunt preluate din baza oficială **CosIng** (Cosmetic Ingredient Database) a Comisiei Europene și organizate conform Regulamentului (CE) nr. 1223/2009:

| Anexa | Conținut | Nr. substanțe | Scor atribuit |
|---|---|---|---|
| Anexa II | Substanțe **interzise** în produsele cosmetice | ~1.856 | -10 |
| Anexa III | Substanțe **restricționate** (limite de concentrație) | ~417 | -5 |
| Anexa IV | **Coloranți** admiși | ~156 | 0 |
| Anexa V | **Conservanți** admiși | ~59 | 0 |
| Anexa VI | **Filtre UV** admise | ~36 | +5 |
| Inventar general | Ingrediente fără restricții UE | ~27.500+ | +10 |
| **Total** | | **~30.000** | |

Sursa datelor: [CosIng — Comisia Europeană](https://ec.europa.eu/growth/tools-databases/cosing/)

---

## Algoritmul de evaluare a toxicității

Algoritmul calculează un **scor de siguranță de la 0 la 100** (100 = complet sigur) printr-un pipeline de 6 faze:

### Faza 1 — Preprocesare text INCI
- Normalizare delimitatori, eliminare artefacte de formatare
- Expandare compuși: `"A (and) B"` → `["A", "B"]`
- Generare variante de căutare (sinonime, formate CI, slash-uri)

### Faza 2 — Rezolvare în baza de date
- Interogări în loturi de câte 100 de ingrediente contra celor ~30.000 de intrări CosIng
- Previne depășirea limitei de buffer PostgREST

### Faza 3 — Potrivire aproximativă și învățare automată
- Matching fuzzy cu prag de similaritate ≥ 0.9 (distanță Levenshtein)
- Cache LRU in-memory (max. 5.000 ingrediente)
- Ingrediente nerezolvate → trimise la Gemini AI pentru evaluare și clasificare
- Rezultatele AI sunt **persistate permanent** în baza de date (auto-învățare)

### Faza 4 — Lista de ingrediente controversate (Commercial Watchlist)
Suprapunere științifică aplicată independent de statusul legal UE:
- Sulfați (SLS/SLES), PEG-uri, săruri de aluminiu, uleiuri minerale
- Siliconi ciclici, BHA/BHT, eliberatori de formaldehidă, parfum nedeclarat

### Faza 5 — Calcul matematic al scorului

```
Scor de bază = 100

Penalizare per ingredient = penalitate[nivel_risc] × multiplicator[poziție_INCI]

Multiplicatoare de poziție (conform concentrației INCI):
  - Pozițiile 1–5:    ×1.5 (concentrație ridicată)
  - Pozițiile 6–10:   ×1.0
  - Pozițiile 11+:    ×0.6 (urme)

Efect cocktail:
  Dacă ≥ 3 ingrediente au nivel de risc ≥ 3 → penalizare suplimentară

Plafonare (ingredientul cel mai periculos impune maximul scorului):
  - Nivel 5 (interzis)      → scor maxim: 20
  - Nivel 4 (risc ridicat)  → scor maxim: 45
  - Nivel 3 (restricționat) → scor maxim: 70
  - >50% necunoscute        → scor maxim: 40
```

### Faza 6 — Personalizare per utilizator
- Alergii declarate: -15 puncte per alergen detectat în compoziție
- Tip de piele: penalizări specifice (ex: piele sensibilă + parfum → -8 pts)
- Detecție greenwashing: comparare claim-uri marketing vs. compoziție reală

---

## Structura proiectului

```
SmartSkin/
│
├── backend/
│   ├── src/
│   │   ├── app.js                    # Server principal, middleware, CORS
│   │   ├── config/
│   │   │   ├── supabase.js           # Client Supabase (service role key)
│   │   │   └── swagger.js            # Specificație OpenAPI 3.0
│   │   ├── controllers/
│   │   │   ├── productController.js  # Produse, căutare, OCR, istoric
│   │   │   ├── aiController.js       # CosmetiBot, istoric conversații
│   │   │   └── adminController.js    # Statistici, rapoarte, utilizatori
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT obligatoriu + opțional
│   │   │   └── admin.js              # Verificare rol administrator
│   │   ├── routes/
│   │   │   └── index.js              # Rutele API cu rate limiting
│   │   └── services/
│   │       ├── toxicityAnalyzer.js   # Algoritmul de toxicitate (~1.080 linii)
│   │       ├── geminiService.js      # OCR, rezolvare AI, chatbot
│   │       ├── openBeautyFacts.js    # Integrare Open Beauty Facts API
│   │       └── makeupApiService.js   # Integrare Makeup API
│   ├── __tests__/
│   │   └── toxicityAnalyzer.test.js  # 45 teste unitare Jest
│   └── database/
│       └── *.sql                     # Schema, migrări, politici RLS
│
├── frontend/
│   ├── App.js                        # Entry point, navigare condițională
│   ├── src/
│   │   ├── screens/                  # 15 ecrane (Scanner, Product, Chat etc.)
│   │   ├── components/               # AnimatedScoreRing, Charts, Layout
│   │   ├── lib/
│   │   │   ├── api.js                # Client HTTP cu timeout și auth
│   │   │   ├── supabase.js           # Client Supabase (anon key)
│   │   │   └── AppContext.js         # State global, teme, localizare
│   │   └── navigation/
│   │       └── MainTabNavigator.js   # Tab-uri + FAB central de scanare
│   └── app.json                      # Configurare Expo, package name
│
└── date_curatate_UE/                 # CSV-uri cu ingrediente UE (Anexele II–VI)
    ├── db_ingrediente_final_corect.csv   # ~30.000 ingrediente consolidate
    ├── ingrediente_interzise_final_anexa2.csv
    ├── ingrediente_restrictionate_final_anexa3.csv
    ├── ingrediente_admise_anexa4.csv
    ├── ingrediente_admise_anexa5_final.csv
    └── ingrediente_admise_anexa6.csv
```

---

## Instalare și rulare locală

### Cerințe preliminare

- Node.js ≥ 18
- Expo Go instalat pe telefon (Android / iOS) sau emulator
- Cont Supabase cu baza de date configurată
- Cheie API Google Gemini

### Backend

```bash
cd backend
cp .env.example .env          # Completează cu cheile de acces
npm install
npm run dev                   # Serverul pornește la http://localhost:3000
```

Variabile de mediu necesare (`.env`):
```
SUPABASE_URL=<URL-ul proiectului Supabase>
SUPABASE_ANON_KEY=<Cheia publică Supabase>
SUPABASE_SERVICE_ROLE_KEY=<Cheia de serviciu Supabase>
GEMINI_API_KEY=<Cheia API Google Gemini>
PORT=3000
```

### Frontend

```bash
cd frontend
npm install
npx expo start
```

Configurează adresa IP a serverului backend în `frontend/app.json` → `expo.extra.backendIp` (telefonul și PC-ul trebuie să fie conectate la aceeași rețea Wi-Fi).

---

## Teste

Proiectul include **45 de teste unitare** Jest care verifică funcțiile pure ale algoritmului de toxicitate:

```bash
cd backend
npm test
```

Componentele testate:
- `scoreToRiskLevel` — maparea scorurilor CosIng la niveluri de risc
- `getCategoryFromDescription` — clasificarea ingredientelor (interzis, restricționat, sigur)
- `buildDescription` — generarea descrierilor formatate
- `calculateSafetyScore` — calculul matematic al scorului de siguranță
- `generateWarnings` — generarea avertismentelor pentru substanțe periculoase
- `getRiskSummary` — rezumatul nivelului de risc per categorie de scor
- `checkCommercialWatchlist` — detecția ingredientelor controversate

---

## API — Documentație

Documentația interactivă Swagger este disponibilă la `/api-docs` (în modul development).

### Endpoint-uri principale

| Metodă | Endpoint | Autentificare | Descriere |
|---|---|---|---|
| `GET` | `/api/health` | — | Verificare stare server |
| `GET` | `/api/products/search?q=` | — | Căutare multi-sursă |
| `GET` | `/api/products/:barcode` | Opțională | Analiză produs după cod de bare |
| `POST` | `/api/products/manual` | Obligatorie | OCR etichetă + analiză toxicitate |
| `POST` | `/api/products/report` | Obligatorie | Raportare problemă produs |
| `POST` | `/api/history` | Obligatorie | Salvare scanare în istoric |
| `GET` | `/api/history` | Obligatorie | Istoric scanări utilizator |
| `POST` | `/api/chat` | Obligatorie | Mesaj către CosmetiBot |
| `GET` | `/api/chat/history/:productId` | Obligatorie | Istoric conversație per produs |
| `GET` | `/api/admin/stats` | Admin | Statistici sistem |
| `GET` | `/api/admin/reports` | Admin | Rapoarte de la utilizatori |
| `GET` | `/api/admin/users` | Admin | Lista utilizatorilor |
| `GET` | `/api/admin/products` | Admin | Lista produselor din cache |

Server de producție: `https://smartskin-api.onrender.com`

---

## Licență

Acest proiect este licențiat sub [Licența MIT](LICENSE).

---

**Proiect de licență** — Vlad Florentina, 2025/2026
