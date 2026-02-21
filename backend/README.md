# CosmetiSafe - Backend API

Backend Node.js + Express pentru aplicatia **SmartSkin** (Proiect Licenta).
Gestioneaza analiza ingredientelor cosmetice, scanarea produselor si istoricul utilizatorilor.

---

## Ce am realizat pana acum (Faza 1 - Backend & Database)

### 1. Baza de Date (Supabase)
- **Ingrediente:** Importat ~30,000 ingrediente cu scoruri de risc (conform regulamente UE).
- **Produse:** Sistem de caching inteligent. Produsele se salveaza automat cand sunt scanate.
- **Utilizatori & Istoric:** Tabele pregatite pentru salvarea scanarilor, bookmark-uri si chat.

### 2. Logica de Business (Backend)
- **Analiza Toxicitatii (Algoritm INCI):** (`src/services/toxicityAnalyzer.js`)
  - Identifica fiecare ingredient in baza de date UE, folosind si un fallback de "Partial Match" pentru nume incomplete.
  - Calculeaza un scor de siguranta (0-100) bazat pe modelul *INCI Beauty* (Cap Penalty System).
  - Ingredientul cu riscul cel mai mare plafoneaza nota produsului la o valoare maxima (ex: Risc 4 = Scor Maxim 45), indiferent de ingredientele sigure.
  - Include penalizare pentru 'Cocktail Effect' (combinatii de multiple chimicale).
  
- **Scanare OCR (Adaugare Manuala cu AI):**
  - Pentru produsele care nu au ingrediente pe internet, aplicatia permite upload-ul unei poze cu eticheta.
  - Backend-ul trimite poza la Inteligent Artificiala Google Gemini (Vision 2.5 Flash) pentru a extrage textul.
  - Salveaza noul produs inteligent in DB folosind operatiunea `upsert` pentru a suprascrie inregistrari invalide fara sa dea erori de conflict (Eroare Postgres 23505).
  
- **Integrare OpenBeautyFacts:** 
  - Cand scanezi un produs, backend-ul il cauta intai in cache-ul local.
  - Daca nu exista (sau nu are ingrediente declarate), il respinge (404 Not Found) pentru a forta utilizatorul sa scaneze manual eticheta cu OCR.

- **AI Chatbot (Multilingv):** (`src/controllers/aiController.js`)
  - Integrat cu Google Gemini (model `gemini-2.5-flash`).
  - **Raspunde in limba utilizatorului** (Romana sau Engleza).
  - Are acces la contextul produsului scanat (ingrediente, riscuri) pentru a oferi explicatii personalizate.

### 3. Rezolvare Probleme Tehnice
- **DNS Fix:** Configurat Google DNS (8.8.8.8) pentru a permite conectarea la Supabase.
- **Securitate (RLS):** Configurat permisiuni ca backend-ul sa poata insera produse noi, dar utilizatorii sa isi vada doar datele proprii.

---

## Cum rulezi proiectul

### Instalare
```bash
npm install
```

### Pornire Server
```bash
npm run dev
```
Serverul porneste pe `http://localhost:3000`.

---

## API Endpoints Principale

| Metoda | Endpoint | Descriere |
|--------|----------|-----------|
| `GET` | `/api/health` | Verifica daca serverul si baza de date merg |
| `GET` | `/api/products/:barcode` | Scaneaza un produs (local sau de pe net) + Analiza Toxicitate |
| `GET` | `/api/test-ingredient` | Cauta detalii despre un ingredient specific |

---

## Urmatorul Pas: Faza 2 (Frontend)

Urmeaza sa construim aplicatia mobila in **React Native (Expo)**:
1. Ecran de Login/Register.
2. **Scanner Camera:** Sa poti scana codul de bare direct cu telefonul.
3. **Afisare Rezultate:** Sa vezi scorul de siguranta si ingredientele colorate (Verde/Rosu).
