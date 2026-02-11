# 🚀 Ghid de Setup - Backend CosmetiSafe

Pașii pentru a rula backend-ul local.

## ✅ Cerințe Preliminare
- Node.js (v18 sau mai nou)
- Cont Supabase (gratuit)
- Editor de cod (VS Code recomandat)

---

## 📋 Pași de Configurare

### 1. Setup Supabase Database

**a) Creează proiect în Supabase:**
1. Mergi la [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Alege un nume (ex: `cosmetisafe-db`)
4. Setează parola bazei de date (salvează-o!)
5. Selectează regiunea (Europe West recomandată)

**b) Rulează schema SQL:**
1. În Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copiază conținutul din `backend/database/schema.sql`
4. Click "Run" pentru a crea tabelele

**c) Verifică crearea tabelelor:**
- Mergi la Table Editor
- Ar trebui să vezi: `products`, `ingredients`, `scanned_products`, `ai_conversations`
- Tabelul `ingredients` ar trebui să aibă deja ~20 de ingrediente populate

### 2. Configurare Variabile de Mediu

**a) Copiază `.env.example` → `.env`:**
```bash
cd backend
copy .env.example .env
```

**b) Completează credențialele Supabase:**
1. În Supabase Dashboard → Settings → API
2. Copiază:
   - `Project URL` → `SUPABASE_URL`
   - `anon/public key` → `SUPABASE_ANON_KEY`

**c) Fișierul `.env` final ar trebui să arate:**
```env
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=  # Opțional pentru Faza 5
PORT=3000
NODE_ENV=development
```

### 3. Instalare Dependințe

```bash
npm install
```

### 4. Pornire Server

```bash
npm run dev
```

**Output așteptat:**
```
🚀 CosmetiSafe Backend running on http://localhost:3000
📍 API endpoints: http://localhost:3000/api

✅ Supabase connection successful

✨ Server ready to accept requests!
```

---

## 🧪 Testare API

### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
```

**Răspuns așteptat:**
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

**Răspuns așteptat:**
```json
{
  "barcode": "3017620422003",
  "name": "Nutella",
  "brand": "Ferrero",
  "ingredientsText": "Sugar, Palm Oil, Hazelnuts...",
  "analysis": {
    "safetyScore": 65,
    "totalIngredients": 8,
    "warnings": ["⚠️ Conține 2 alergeni comuni"],
    "riskSummary": "Risc scăzut - acceptabil pentru majoritatea utilizatorilor"
  },
  "source": "live"
}
```

---

## 📊 Endpoints Disponibile (momentan)

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/products/:barcode` | Fetch produs + analiză |
| POST | `/api/history` | Salvează în istoric (fără auth deocamdată) |
| GET | `/api/history` | Lista istoric (fără auth deocamdată) |

---

## 🐛 Troubleshooting

**Eroare: "Missing Supabase credentials"**
- Verifică că ai creat fișierul `.env` (nu `.env.example`)
- Verifică că ai copiat corect `SUPABASE_URL` și `SUPABASE_ANON_KEY`

**Eroare: "Supabase connection failed"**
- Verifică că ai rulat scriptul SQL (`schema.sql`)
- Verifică că tabelul `ingredients` există în Table Editor

**Eroare: "Product not found"**
- API-ul Open Beauty Facts nu are produsul respectiv
- Încearcă cu barcode-ul de test: `3017620422003` (Nutella)

---

## 📝 Next Steps

După ce backend-ul funcționează:
1. **Faza 2**: Implementare autentificare Supabase
2. **Faza 3**: Setup React Native + scanare barcode
3. **Faza 4**: Îmbunătățiri algoritm scoring
4. **Faza 5**: Integrare AI chatbot (Gemini)

---

**Status**: ✅ Backend funcțional - gata pentru testare!
