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
- **Analiza Toxicitatii (Algoritm Smart):** (`src/services/toxicityAnalyzer.js`)
  - Identifica fiecare ingredient in baza de date UE.
  - Calculeaza un scor de siguranta (0-100) bazat op pe media ponderata a riscurilor (primele 5 ingrediente conteaza dublu).
  - **Penalizeaza drastic** prezenta ingredientelor interzise sau cu risc ridicat.
  - Genereaza avertismente specifice (ex: "Contine Parabeni", "Risc de disruptori endocrini").
  
- **Integrare OpenBeautyFacts:** 
  - Cand scanezi un produs, backend-ul il cauta intai local.
  - Daca nu exista, il descarca automat de pe internet (Open Beauty Facts API).
  - Il salveaza in baza ta de date pentru scanari viitoare (Auto-Learning).

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
