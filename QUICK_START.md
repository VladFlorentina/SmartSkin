# 🚀 Quick Start Guide - CosmetiSafe

## ✅ Status Actual

**Baza de date:** ✅ DONE
- Tabelul `ingredients` populat cu ~2,500 ingrediente din datele oficiale UE (CosIng)
- Structură: `name`, `score`, `description`

**Backend:** ✅ DONE  
- API REST complet implementat
- Algoritm de scoring toxicitate
- Integrare cu Open Beauty Facts

---

## 🎯 Pași pentru Pornire Backend

### 1. Completează `.env` cu Supabase Anon Key

**a) Deschide Supabase Dashboard:**
- URL: https://supabase.com/dashboard/project/pgpuswmlyyvgutoxlk

**b) Obține Anon Key:**
1. Mergi la **Settings** → **API**
2. Găsește secțiunea "Project API keys"
3. Copiază cheia **`anon` / `public`** (nu service_role!)

**c) Editează fișierul `.env`:**
```bash
cd backend
notepad .env  # sau orice editor
```

Înlocuiește `your_anon_key_here_from_supabase_dashboard` cu cheia ta.

### 2. Pornește Backend-ul

```bash
cd backend
npm run dev
```

**Output așteptat:**
```
🚀 CosmetiSafe Backend running on http://localhost:3000
📍 API endpoints: http://localhost:3000/api

✅ Supabase connection successful

✨ Server ready to accept requests!
```

### 3. Testare API

**a) Health Check (în browser):**
```
http://localhost:3000/api/health
```

**b) Test Scanare Produs (Nutella - barcode test):**
```
http://localhost:3000/api/products/3017620422003
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
    "warnings": ["⚠️ 2 ingrediente restricționate în UE"],
    "riskSummary": "Risc scăzut - acceptabil pentru majoritatea utilizatorilor"
  },
  "source": "live"
}
```

---

## 📝 Next Steps

După ce backend-ul funcționează:

1. **Rulează script SQL pentru tabele suplimentare:**
   - În Supabase → SQL Editor
   - Copiază din `backend/database/schema.sql`
   - Creează tabelele: `products`, `scanned_products`, `ai_conversations`

2. **Frontend React Native** (Faza 3):
   - Setup Expo
   - Barcode scanner
   - UI pentru afișare produse

3. **AI Chatbot** (Faza 5):
   - Obține Gemini API key
   - Completează în `.env`

---

**💡 Ai nevoie de ajutor?** Rulează server-ul și testează cu barcode-ul de test mai sus!
