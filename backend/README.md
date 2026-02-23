# CosmetiSafe - Backend API

Backend Node.js + Express pentru aplicatia **SmartSkin / CosmetiSafe** (Proiect Licenta).
Gestioneaza analiza ingredientelor cosmetice, scanarea produselor, chatbot AI si istoricul utilizatorilor.

---

## Ce am realizat

### 1. Baza de Date (Supabase)
- **Ingrediente CosIng:** ~30,000 ingrediente INCI importate din baza de date oficiala a Comisiei Europene (CosIng), cu scoruri de risc bazate pe Anexele II-VI ale Regulamentului UE 1223/2009.
- **Produse (Cache Comunitar):** Produsele scanate se salveaza automat in baza de date. Cand un alt utilizator scaneaza acelasi produs, rezultatul vine instant din cache.
- **Istoric Personal:** Tabelul `scanned_products` pastreaza istoricul scanarilor per utilizator.
- **Conversatii AI:** Tabelul `ai_conversations` salveaza contextul chatbot-ului.
- **Service Role Key:** Backend-ul foloseste `SUPABASE_SERVICE_ROLE_KEY` pentru acces complet la DB (bypass RLS).

### 2. Algoritm de Analiza Toxicitate (`src/services/toxicityAnalyzer.js`)
- **Batch Query Optimizat:** Un singur SELECT pentru toate ingredientele (in loc de N queries separate).
- **Normalizare INCI:** Elimina sinonimele din paranteze (ex: "Parfum (Fragrance)" -> "PARFUM").
- **Scor de Siguranta (0-100):**
  - Score Cap System: ingredientul cu riscul cel mai mare plafoneaza nota (ex: ingredient interzis -> max 20/100).
  - Position Multiplier: primele 5 ingrediente au penalizare x1.5 (concentratie mare in INCI).
  - Cocktail Effect: 3+ ingrediente de risc >=3 adauga penalizare extra.
- **Diferentiere Alergeni Parfumati:** Limonene, Linalool etc. (Anexa III cu functie PERFUMING) primesc risc 2 (nu 3), ceea ce e mai realist.
- **Commercial Watchlist:** Fallback pentru ingrediente legale dar controversate (SLS, PEG, BHT, etc.) - se aplica doar cand ingredientul NU e gasit in CosIng.
- **Verificat cu 45 teste Jest** (`npm test`).

### 3. OCR cu Google Gemini AI (`src/services/geminiService.js`)
- Utilizatorul fotografiaza eticheta cu ingrediente.
- Imaginea (base64) e trimisa la Google Gemini 2.5 Flash cu prompt specializat.
- AI-ul extrage lista INCI din imagine.
- Produsul e salvat in cache-ul comunitar pentru utilizatorii viitori.

### 4. Chatbot AI - CosmetiBot (`src/controllers/aiController.js`)
- Integrat cu Google Gemini (`gemini-2.5-flash`).
- Raspunde in limba romana.
- Are acces la contextul produsului scanat (ingrediente, riscuri) pentru explicatii personalizate.
- Protejat cu autentificare JWT + rate limiting (10 mesaje/minut).

### 5. Open Beauty Facts (`src/services/openBeautyFacts.js`)
- Folosit doar ca sursa de **metadata** (nume, brand, imagine) - cu timeout de 3 secunde.
- Daca OBF are ingrediente, le folosim; daca nu, cerem OCR de la utilizator.
- Non-blocking: esecul OBF nu opreste fluxul principal.

### 6. Securitate si Performanta
- **Rate Limiting:** Global (100/min), Chat AI (10/min), OCR (5/min) via `express-rate-limit`.
- **Auth Middleware:** Endpoint-urile `/chat` si `/history` necesita JWT valid de la Supabase.
- **Input Validation:** Verificare dimensiune imagine (<10MB), format MIME, lungime nume produs.
- **Request Size:** `express.json({ limit: '50mb' })` pentru imagini base64.

### 7. Documentatie API (Swagger)
- Swagger UI disponibil la `http://localhost:3000/api-docs`.
- Toate cele 7 endpoint-uri documentate cu parametri, request bodies, response schemas.
- Specificatie OpenAPI 3.0 exportabila la `/api-docs.json`.

---

## API Endpoints

| Metoda | Endpoint | Auth | Rate Limit | Descriere |
|--------|----------|------|------------|-----------|
| `GET` | `/api/products/:barcode` | Nu | Global | Cauta produs (cache -> OBF -> needsOcr) |
| `POST` | `/api/products/manual` | Nu | 5/min | Adauga produs manual cu OCR (imagine base64) |
| `POST` | `/api/history` | Da | Global | Salveaza produs in istoricul personal |
| `GET` | `/api/history` | Da | Global | Returneaza istoricul de scanari |
| `POST` | `/api/chat` | Da | 10/min | Trimite mesaj catre CosmetiBot (Gemini AI) |
| `GET` | `/api/test-ingredient` | Nu | Global | Debug: cauta ingredient in DB CosIng |
| `GET` | `/api/health` | Nu | Global | Health check |

---

## Cum rulezi proiectul

### Instalare
```bash
npm install
```

### Configurare
```bash
cp .env.example .env
# Completeaza: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
```

### Pornire Server
```bash
npm run dev      # Cu auto-restart (--watch)
npm start        # Fara auto-restart
```
Serverul porneste pe `http://localhost:3000`.

### Teste
```bash
npm test         # 45 teste unitare Jest
```

### Documentatie API
Deschide `http://localhost:3000/api-docs` in browser dupa pornirea serverului.
