# SmartSkin Frontend - Documentatie

Aplicatia mobila React Native (Expo) pentru **CosmetiSafe** - Smart Cosmetic Analyzer.

---

## Tehnologii Utilizate
* **Framework:** React Native (via Expo SDK 52/54)
* **Limbaj:** JavaScript (ES Modules)
* **Stilizare:** NativeWind (TailwindCSS) - `className="..."`
* **Navigare:** React Navigation (Native Stack) - `@react-navigation/native-stack`
* **Backend:** Node.js + Express (API REST)
* **Baza de date & Auth:** Supabase (JWT Authentication)
* **AI:** Google Gemini 2.5 Flash (prin backend)

---

## Structura Ecrane

| Ecran | Fisier | Descriere |
|-------|--------|-----------|
| Login | `LoginScreen.js` | Autentificare cu email + parola via Supabase |
| Register | `RegisterScreen.js` | Creare cont nou |
| Scanner | `ScannerScreen.js` | Camera pentru scanare coduri de bare EAN-13/UPC |
| Product | `ProductScreen.js` | Afisare scor siguranta, ingrediente colorate, optiune OCR + chat |
| ManualAdd | `ManualAddScreen.js` | Upload fotografie eticheta pentru OCR (Gemini AI) |
| Chat | `ChatScreen.js` | Conversatie cu CosmetiBot despre produsul scanat |
| History | `HistoryScreen.js` | Lista produselor scanate anterior |
| Profile | `ProfileScreen.js` | Setare tip de piele, alergii, sign out |

---

## Logica de Functionare (Flow-uri Principale)

### 1. Autentificare
* **Login:** Email + Parola -> Supabase returneaza un token (JWT).
* **Register:** Creare cont nou cu validare.
* **Persistence:** Token-ul este salvat local (AsyncStorage), utilizatorul ramane logat.
* **Navigare:** `AuthStack` (Login/Register) vs `AppStack` (ecranele app) - switch automat pe baza sesiunii.

### 2. Scanarea Produsului (Core Feature)
1. **Userul scaneaza** un cod de bare cu camera telefonului.
2. Aplicatia trimite codul catre Backend: `GET /api/products/:barcode`.
3. **Trei scenarii posibile:**
   * **Cache hit:** Produsul exista deja in baza de date -> rezultat instant.
   * **OBF hit:** Open Beauty Facts are ingredientele -> analiza + salvare in cache comunitar.
   * **OCR needed:** Backend returneaza `needsOcr: true` -> utilizatorul vede ecran "Produs Nou Detectat!" cu buton pentru a fotografia eticheta.
4. **Afisare:** Scor siguranta (0-100), lista ingrediente colorata, warning-uri.

### 3. OCR - Adaugare Manuala cu AI
* Daca produsul nu e gasit, utilizatorul fotografiaza eticheta cu ingrediente.
* Imaginea e trimisa la backend (`POST /api/products/manual`) care o proceseaza cu Google Gemini AI.
* Gemini extrage lista INCI, backend-ul analizeaza toxicitatea si salveaza in cache comunitar.
* Produsul devine disponibil instant pentru toti utilizatorii viitori.

### 4. Chatbot AI (CosmetiBot)
* Dupa analiza unui produs, utilizatorul poate intreba CosmetiBot despre ingrediente.
* Chatbot-ul primeste contextul produsului (ingrediente, riscuri, scor) si raspunde in romana.
* Protejat cu autentificare JWT.

### 5. Profil Utilizator
* Selectie tip de piele: Normala / Uscata / Grasa / Mixta / Sensibila.
* Toggle alergii comune: Parfum, Parabeni, Sulfati, Coloranti, Formaldehida, etc.
* Datele sunt salvate in `user_metadata` pe Supabase.
* Sign out cu dialog de confirmare.

### 6. Istoric Personal
* Lista produselor scanate anterior cu nume, brand, scor si data.
* Tap pe produs -> redirijare la ecranul de analiza.

---

## Componente Reutilizabile

| Componenta | Descriere |
|------------|-----------|
| `Button.js` | Buton stilizat cu NativeWind |
| `Input.js` | Camp de text cu label si validare |
| `Layout.js` | Container cu SafeAreaView si padding |
| `ErrorBoundary.js` | Catch React errors, afiseaza fallback UI in romana |

---

## Configurare IP Backend

IP-ul backend-ului se seteaza in `app.json`:
```json
{
  "expo": {
    "extra": {
      "backendIp": "192.168.100.26",
      "backendPort": "3000"
    }
  }
}
```
Modifica `backendIp` cu IP-ul PC-ului tau (telefonul/emulatorul trebuie sa fie pe aceeasi retea WiFi).

---

## Ce am realizat

### Faza 1: Setup (FINALIZAT)
- [x] Initializare proiect Expo
- [x] Configurare NativeWind (Tailwind)
- [x] Configurare Client Supabase
- [x] Structura directoare (`src/screens`, `src/components`)

### Faza 2: Autentificare & UI (FINALIZAT)
- [x] Componente reutilizabile: Button, Input, Layout
- [x] Ecrane LoginScreen si RegisterScreen cu Supabase Auth
- [x] Interfata in limba romana
- [x] Logica de sesiune (pastrarea userului logat) in App.js

### Faza 3: Scanare, Produs & OCR AI (FINALIZAT)
- [x] Scanner camera cu expo-barcode-scanner
- [x] Ecran ProductScreen cu fetch inteligent (Cache -> OBF -> OCR)
- [x] Scoring vizual (Verde/Galben/Rosu) bazat pe scorul 0-100
- [x] Lista ingrediente colorata pe nivel de risc
- [x] ManualAddScreen cu upload poza + OCR via Gemini AI
- [x] Flow "Produs Nou Detectat!" cand produsul necesita OCR

### Faza 4: Profil & Istoric (FINALIZAT)
- [x] HistoryScreen cu lista produselor scanate
- [x] ProfileScreen cu selectie tip de piele si alergii
- [x] Salvare preferinte in Supabase user_metadata
- [x] Sign out cu dialog de confirmare

### Faza 5: AI Chat & Navigare (FINALIZAT)
- [x] ChatScreen cu conversatie CosmetiBot
- [x] React Navigation (Native Stack) cu AuthStack + AppStack
- [x] ErrorBoundary component
- [x] useFocusEffect pe ScannerScreen (reset camera la revenire)

---

## Cum rulezi proiectul

```bash
cd frontend
npm install
npx expo start
```
Scaneaza codul QR cu **Expo Go** (Android) sau Camera (iOS).
Telefonul trebuie sa fie pe aceeasi retea WiFi cu PC-ul.
