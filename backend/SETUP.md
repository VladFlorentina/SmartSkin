# Ghid de Setup - Backend CosmetiSafe

Pasii pentru a rula backend-ul local.

## Cerinte Preliminare
- Node.js (v18 sau mai nou)
- Cont Supabase (gratuit)
- Editor de cod (VS Code recomandat)

---

## Pasi de Configurare

### 1. Setup Supabase Database

**a) Creaza proiect in Supabase:**
1. Mergi la [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Alege un nume (ex: `cosmetisafe-db`)
4. Seteaza parola bazei de date (salveaz-o!)
5. Selecteaza regiunea (Europe West recomandata)

**b) Ruleaza schema SQL:**
1. In Supabase Dashboard > SQL Editor
2. Click "New Query"
3. Copiaza continutul din `backend/database/schema.sql`
4. Click "Run" pentru a crea tabelele

**c) Verifica crearea tabelelor:**
- Mergi la Table Editor
- Ar trebui sa vezi: `products`, `ingredients`, `scanned_products`, `ai_conversations`
- Tabelul `ingredients` ar trebui sa aiba deja ~20 de ingrediente populate

### 2. Configurare Variabile de Mediu

**a) Copiaza `.env.example` -> `.env`:**
```bash
cd backend
copy .env.example .env
```

**b) Completeaza credentialele Supabase:**
1. In Supabase Dashboard > Settings > API
2. Copiaza:
   - `Project URL` -> `SUPABASE_URL`
   - `anon/public key` -> `SUPABASE_ANON_KEY`

**c) Fisierul `.env` final ar trebui sa arate:**
```env
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=  # Optional pentru Faza 5
PORT=3000
NODE_ENV=development
```

### 3. Instalare Dependinte

```bash
npm install
```

### 4. Pornire Server

```bash
npm run dev
```

**Output asteptat:**
```
[INFO] CosmetiSafe Backend running on http://localhost:3000
[INFO] API endpoints: http://localhost:3000/api

[INFO] Supabase connection successful

[INFO] Server ready to accept requests!
```

---

## Testare API

### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
```

**Raspuns asteptat:**
```json
{
  "status": "ok",
  "service": "CosmetiSafe API",
  "version": "1.0.0"
}
```

### Test 2: Scanare Produs (Nutella - pentru test)
```bash
curl http://localhost:3000/api/products/3017620422003
```

**Raspuns asteptat:**
```json
{
  "barcode": "3017620422003",
  "name": "Nutella",
  "brand": "Ferrero",
  "ingredientsText": "Sugar, Palm Oil, Hazelnuts...",
  "analysis": {
    "safetyScore": 65,
    "totalIngredients": 8,
    "warnings": ["ATENTIE: Contine 2 alergeni comuni"],
    "riskSummary": "Risc scazut - acceptabil pentru majoritatea utilizatorilor"
  },
  "source": "live"
}
```

---

## Endpoints Disponibile (momentan)

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/products/:barcode` | Fetch produs + analiza |
| POST | `/api/history` | Salveaza in istoric (fara auth deocamdata) |
| GET | `/api/history` | Lista istoric (fara auth deocamdata) |

---

## Troubleshooting

**Eroare: "Missing Supabase credentials"**
- Verifica ca ai creat fisierul `.env` (nu `.env.example`)
- Verifica ca ai copiat corect `SUPABASE_URL` si `SUPABASE_ANON_KEY`

**Eroare: "Supabase connection failed"**
- Verifica ca ai rulat scriptul SQL (`schema.sql`)
- Verifica ca tabelul `ingredients` exista in Table Editor

**Eroare: "Product not found"**
- API-ul Open Beauty Facts nu are produsul respectiv
- Incearca cu barcode-ul de test: `3017620422003` (Nutella)

---

## Next Steps

Dupa ce backend-ul functioneaza:
1. **Faza 2**: Implementare autentificare Supabase
2. **Faza 3**: Setup React Native + scanare barcode
3. **Faza 4**: Imbunatatiri algoritm scoring
4. **Faza 5**: Integrare AI chatbot (Gemini)

---

**Status**: Backend functional - gata pentru testare!
