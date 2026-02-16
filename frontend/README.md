# SmartSkin Frontend - Documentatie & Plan de Dezvoltare

Acest document descrie logica, structura si planul de implementare pentru aplicatia mobila.

---

## Tehnologii Utilizate
*   **Framework:** React Native (via Expo 52)
*   **Limbaj:** JavaScript / React
*   **Stilizare:** NativeWind (TailwindCSS) - `className="..."`
*   **Backend:** Node.js + Express (API)
*   **Baza de date:** Supabase (Auth + Storage)
*   **AI:** Google Gemini (prin backend)

---

## Logica de Functionare (Flow-uri Principale)

### 1. Autentificare (Sesiunea Urmatoare)
*   **Login:** Email + Parola -> Supabase returneaza un token (JWT).
*   **Register:** Creare cont nou.
    *   *Backend Magic:* Cand se creeaza userul, backend-ul ii creeaza automat un profil gol in tabela `user_profiles` (prin trigger).
*   **Persistence:** Token-ul este salvat local in telefon (AsyncStorage), deci userul ramane logat.

### 2. Scanarea Produsului (Core Feature)
1.  **Userul scaneaza** un cod de bare cu camera telefonului.
2.  Aplicatia trimite codul catre Backend: `GET /api/products/:barcode`.
3.  **Backend Decisions:**
    *   *Pas 1:* Cauta in baza noastra (`products`). Daca exista -> Returneaza instant (Cache).
    *   *Pas 2:* Daca NU exista -> Cauta pe OpenBeautyFacts API.
    *   *Pas 3:* Daca gaseste pe OBF -> Descarca, Analizeaza Toxicitatea (Algoritm v2), Salveaza Local, Returneaza rezultat.
4.  **Afisare:** Aplicatia primeste JSON-ul cu ingrediente, scor (0-100) si warning-uri.

### 3. Analiza Toxicitatii (Visuals)
*   **Scor 80-100:** Verde (Safe)
*   **Scor 40-79:** Galben (Moderate)
*   **Scor 0-39:** Rosu (Toxic/Avoid)
*   Userul vede lista de ingrediente colorata in functie de risc.

---

## Plan de Implementare (Roadmap)

### Faza 1: Setup (FINALIZAT)
- [x] Initializare proiect Expo
- [x] Configurare NativeWind (Tailwind)
- [x] Configurare Client Supabase
- [x] Structura directoare (`src/screens`, `src/components`)

### Faza 2: Autentificare (URMEAZA ACUM)
- [ ] **Ecran Login:** Input email, parola, buton "Intra".
- [ ] **Ecran Register:** Input nume, email, parola, confirmare.
- [ ] **Integrare:** Legare la `supabase.auth.signInWithPassword`.
- [ ] **Navigare:** Daca e logat -> Home; Daca nu -> Login.

### Faza 3: Scanare & Produs
- [ ] **Ecran Home:** Buton mare de scanare.
- [ ] **Camera:** Integrare `expo-camera` sau `expo-barcode-scanner`.
- [ ] **Ecran Produs:** Fetch date de la backend si afisare scor/ingrediente.

### Faza 4: Profil & Istoric
- [ ] **Ecran Istoric:** Lista produselor scanate anterior (din `scanned_products`).
- [ ] **Ecran Profil:** Setare tip de ten si alergii (pentru AI).

### Faza 5: AI Chat
- [ ] **Ecran Chat:** Conversatie cu CosmetiBot despre produsul scanat.

---

## Cum rulezi proiectul

1.  Deschide terminal in folderul `frontend`:
    ```bash
    cd frontend
    ```
2.  Porneste serverul de development:
    ```bash
    npx expo start
    ```
3.  Scaneaza codul QR cu telefonul (folosind aplicatia **Expo Go**).
