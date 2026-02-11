# CosmetiSafe - Backend API 🛡️

Backend Node.js + Express pentru aplicația **SmartSkin** (Proiect Licență).
Gestionează analiza ingredientelor cosmetice, scanarea produselor și istoricul utilizatorilor.

---

## ✅ Ce am realizat până acum (Faza 1 - Backend & Database)

### 1. Baza de Date (Supabase) 🗄️
- **Ingrediente:** Importat ~30,000 ingrediente cu scoruri de risc (conform regulamente UE).
- **Produse:** Sistem de caching inteligent. Produsele se salvează automat când sunt scanate.
- **Utilizatori & Istoric:** Tabele pregătite pentru salvarea scanărilor, bookmark-uri și chat.

### 2. Logică de Business (Backend) 🧠
- **Analiza Toxicității (Algoritm Smart):** (`src/services/toxicityAnalyzer.js`)
  - Identifică fiecare ingredient în baza de date UE.
  - Calculează un scor de siguranță (0-100) bazat pe media riscurilor.
  - **Penalizează drastic** prezența ingredientelor interzise sau cu risc ridicat.
  - Generează avertismente specifice (ex: "Conține Parabeni", "Risc de disruptori endocrini").
  
- **Integrare OpenBeautyFacts:** 
  - Când scanezi un produs, backend-ul îl caută întâi local.
  - Dacă nu există, îl descarcă automat de pe internet (Open Beauty Facts API).
  - Îl salvează în baza ta de date pentru scanări viitoare (Auto-Learning).

- **AI Chatbot (Multilingv):** (`src/controllers/aiController.js`)
  - Integrat cu Google Gemini (model `gemini-2.5-flash`).
  - **Răspunde în limba utilizatorului** (Română sau Engleză).
  - Are acces la contextul produsului scanat (ingrediente, riscuri) pentru a oferi explicații personalizate.

### 3. Rezolvare Probleme Tehnice 🛠️
- **DNS Fix:** Configurat Google DNS (8.8.8.8) pentru a permite conectarea la Supabase.
- **Securitate (RLS):** Configurat permisiuni ca backend-ul să poată insera produse noi, dar utilizatorii să își vadă doar datele proprii.

---

## 🚀 Cum rulezi proiectul

### Instalare
```bash
npm install
```

### Pornire Server
```bash
npm run dev
```
Serverul pornește pe `http://localhost:3000`.

---

## 🔌 API Endpoints Principale

| Metodă | Endpoint | Descriere |
|--------|----------|-----------|
| `GET` | `/api/health` | Verifică dacă serverul și baza de date merg |
| `GET` | `/api/products/:barcode` | Scanează un produs (local sau de pe net) + Analiză Toxicitate |
| `GET` | `/api/test-ingredient` | Caută detalii despre un ingredient specific |

---

## 🔜 Următorul Pas: Faza 2 (Frontend)

Urmează să construim aplicația mobilă în **React Native (Expo)**:
1. Ecran de Login/Register.
2. **Scanner Cameră:** Să poți scana codul de bare direct cu telefonul.
3. **Afisare Rezultate:** Să vezi scorul de siguranță și ingredientele colorate (Verde/Roșu).
