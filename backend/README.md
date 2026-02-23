# CosmetiSafe - Backend API

Backend Node.js + Express pentru aplicatia SmartSkin / CosmetiSafe.
Proiect de licenta.

---

## Ce contine

### Baza de date (Supabase)

- **Ingrediente CosIng:** ~30.000 ingrediente INCI importate din baza de date a Comisiei Europene,
  cu scoruri de risc bazate pe Anexele II-VI din Regulamentul UE 1223/2009.
- **Cache comunitar (products):** Produsele analizate se salveaza automat. La urmatoarea scanare
  a aceluiasi produs de catre orice utilizator, rezultatul vine instant din cache.
- **Istoric personal (scanned_products):** Istoricul scanarilor per utilizator.
- **Conversatii AI (ai_conversations):** Contextul sesiunilor de chatbot.
- Backend-ul foloseste `SUPABASE_SERVICE_ROLE_KEY` pentru acces complet (bypass RLS).

### Algoritm de analiza toxicitate (toxicityAnalyzer.js)

- Batch query optimizat: un singur SELECT pentru toate ingredientele din lista.
- Normalizare INCI: elimina sinonimele din paranteze (ex: "Parfum (Fragrance)" -> "PARFUM").
- Scor de siguranta 0-100:
  - **Score cap:** ingredientul cu riscul cel mai mare plafoneaza scorul maxim posibil
    (ex: ingredient interzis -> max 20/100)
  - **Position multiplier:** primele 5 ingrediente au penalizare x1.5 (concentratie mai mare)
  - **Cocktail effect:** 3+ ingrediente de risc >= 3 adauga penalizare suplimentara
- Diferentiere alergeni parfumati: Limonene, Linalool etc. primesc risc 2 (nu 3) - mai realist.
- Commercial watchlist: fallback pentru ingrediente controversate dar legale (SLS, PEG, BHT etc.)
- Verificat cu 45 teste Jest.

### Personalizare bazata pe profil utilizator

Daca userul e autentificat si are profil completat, backend-ul:
- Detecteaza ingredientele care corespund alergiilor declarate (10 tipuri de alergii -> pattern INCI)
- Aplica avertismente specifice tipului de piele (sensibila, uscata, grasa)
- Ajusteaza scorul cu o penalizare de max 40 puncte

### OCR cu Google Gemini AI (geminiService.js)

- Utilizatorul fotografiaza eticheta cu ingrediente
- Imaginea (base64) e trimisa la Gemini 2.5 Flash cu un prompt specializat
- AI-ul extrage lista INCI si o returneaza structurat
- Produsul e salvat in cache pentru utilizatorii viitori

### Chatbot CosmetiBot (aiController.js)

- Integrat cu Google Gemini (gemini-2.5-flash)
- Raspunde in limba romana
- Primeste contextul produsului scanat (ingrediente, riscuri) pentru raspunsuri relevante
- Protejat cu autentificare JWT si rate limiting (10 mesaje/minut)

### Open Beauty Facts (openBeautyFacts.js)

- Folosit doar pentru metadata: nume, brand, imagine. Timeout de 3 secunde.
- Daca OBF are ingredientele, le folosim; daca nu, declansam fluxul OCR.
- Eroare non-blocking: esecul OBF nu opreste fluxul principal.

### Securitate

- Rate limiting: global (100/min), chat (10/min), OCR (5/min)
- Auth middleware: `/chat` si `/history` necesita JWT valid Supabase
- Optional auth middleware: `/products` nu blocheaza anonimii dar personalizeaza daca e logat
- Validare input: dimensiune imagine (<10MB), format MIME, lungime campuri

### Documentatie API (Swagger)

- Swagger UI la `http://localhost:3000/api-docs`
- 7 endpoint-uri documentate cu parametri, request bodies si response schemas
- OpenAPI 3.0, exportabil la `/api-docs.json`

---

## Endpoints

| Metoda | Endpoint | Auth | Rate Limit | Descriere |
|--------|----------|------|------------|-----------|
| GET | `/api/products/:barcode` | optional | global | cauta produs (cache -> OBF -> needsOcr) |
| POST | `/api/products/manual` | optional | 5/min | adauga produs manual cu OCR (base64) |
| POST | `/api/history` | necesar | global | salveaza produs in istoricul personal |
| GET | `/api/history` | necesar | global | returneaza istoricul de scanari |
| POST | `/api/chat` | necesar | 10/min | trimite mesaj catre CosmetiBot |
| GET | `/api/test-ingredient` | nu | global | debug: cauta ingredient in CosIng |
| GET | `/api/health` | nu | global | health check |

---

## Cum rulezi

```bash
npm install
cp .env.example .env    # completeaza SUPABASE_URL, keys, GEMINI_API_KEY
npm run dev             # server la http://localhost:3000
npm test                # 45 teste Jest
```

Documentatie API: `http://localhost:3000/api-docs`
