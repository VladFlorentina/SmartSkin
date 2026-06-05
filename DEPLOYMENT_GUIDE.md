# Ghid de Deployment și Arhitectură - SmartSkin

Acest document sumarizează întreaga arhitectură, pașii de deployment și soluțiile la problemele (bug-urile) întâlnite în procesul de trecere de la un mediu de dezvoltare local la aplicația nativă Android (`.apk`), gata de producție pentru licență.

---

## 1. Arhitectura Aplicației
* **Frontend:** React Native (framework) administrat prin **Expo**. Folosește NativeWind pentru stilizare (TailwindCSS).
* **Backend:** Node.js (Express), găzduit gratuit pe **Render.com**.
* **Bază de date & Autentificare:** **Supabase** (PostgreSQL + sistem complet de OAuth pentru Google Login).

---

## 2. Generarea aplicației Android (.apk) folosind Expo EAS

Pentru a transforma codul de React Native într-o aplicație fizică (`.apk`) fără a avea nevoie de Android Studio local, am folosit infrastructura din cloud **EAS (Expo Application Services)**.

### Configurația `eas.json`
Aplicația se compilează pe planul de `preview`. Configurația crucială din `frontend/eas.json` arată astfel:
```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  },
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "https://hpjuwswmlyvygutvoald.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "[CHEIA_SECRETA_AICI]"
  }
}
```
**De reținut:** În mod normal, valorile din `.env` nu sunt urcate pe server din motive de securitate (`.gitignore`). Pentru ca serverele EAS să știe cheile de Supabase (și aplicația să nu crape la deschidere pe ecran alb), acestea au fost hardcodate direct în `eas.json` sub obiectul `"env"`.

### Comenzile folosite pentru build
Pentru a trimite codul către serverele Expo și a aștepta fișierul `.apk`:
```bash
eas build -p android --profile preview
```
Pentru simularea construirii aplicației local (pentru a vâna erori de JavaScript de tip Metro Bundler înainte de a trimite pe EAS):
```bash
npx expo export --platform android
```

---

## 3. Probleme Întâlnite și Rezolvări (Troubleshooting)

Pe parcursul procesului de deployment, au fost identificate și rezolvate mai multe probleme specifice mediilor mobile și de cloud:

### A. Bug-ul de "White Screen of Death" (Crash instant la deschidere pe telefon)
* **Simptom:** Aplicația se deschidea și îngheța instantaneu pe un ecran alb/gri, sau pur și simplu dădea *force close*.
* **Cauza principală:** Lipsa cheilor publice de API (`EXPO_PUBLIC_SUPABASE...`) din interiorul APK-ului, ceea ce ducea la o eroare fatală asincronă în prima milisecundă de executare a aplicației + lipsa gestionării de splash-screen nativ.
* **Soluția:** Injectarea "env" în `eas.json` și instalarea modulelor `expo-updates` și `expo-splash-screen` care oferă stabilitate la bootare.

### B. Eroarea de Compilare `Use process(css).then(cb) to work with async plugins` (Tailwind / NativeWind)
* **Simptom:** La rularea build-ului, mașinăria JS (Metro Bundler) eșua la asamblare.
* **Cauza:** O versiune mult prea nouă a pachetului `tailwindcss` (`3.4+`) descărcată de NPM, care nu este compatibilă cu mașina internă Babel folosită de pachetul `nativewind` (v2.0) folosit.
* **Soluția:** Executarea unui downgrade controlat și strict:
  `npm install tailwindcss@3.3.2 --save-exact`

### C. Blocajul Autentificării Google (Supabase OAuth Redirect)
* **Simptom:** După selectarea contului de Google, browser-ul rămânea blocat pe un ecran alb cu mesajul API-ului, iar telefonul nu era redirecționat înapoi în aplicație.
* **Cauza:** Platforma Supabase era complet necunoscătoare în legătură cu IP-ul Wi-Fi pe care rulează Expo Go (`10.x.x.x:8081`). Wildcard-urile standard (`exp://*`) eșuau din cauza specificității portului.
* **Soluția:** S-a înregistrat adresa exactă returnată de eroare (`exp://10.86.249.123:8081/--/auth/callback`) fix ca **Site URL** în dashboard-ul Supabase (URL Configuration), iar backend-ul principal a fost trecut jos, la secțiunea de Fallback/Redirect URLs. (Pentru varianta de producție APK s-a setat schema: `smartskin://**`).

### D. Eroarea de "Render Cold Start" (Timeout la obținerea istoricului)
* **Simptom:** Apărea eroarea `Could not load history. Please check your connection.`, deși internetul funcționa corect. La un al doilea click efectuat repede după, cererea reușea imediat.
* **Cauza:** Planul gratuit (Free Tier) oferit de serverele Render adoarme mașinăria (`Backend`) după 15 minute de inactivitate. La prima accesare trezirea durează ~45 secunde, dar telefonul întrerupea cererea intern după doar 10 secunde (`AbortController`).
* **Soluția:** Timeout-ul din componenta `frontend/src/lib/api.js` (răspunzătoare de apelurile la baza de date / `fetchUserHistory`) a fost mutat curajos de la `10000ms` la `60000ms`, așteptând cuminte ridicarea serverului.

### E. Bug-ul de "Infinite Render Loop" la `react-native-toast-message`
* **Simptom:** Aplicația se bloca vizual, butoanele UI nu preluau presiuni externe, aparatul reacționa doar la butoanele fizice.
* **Cauza:** Variabila customizată `toastConfig` era declarată **în interiorul** funcției `App`, re-creându-se încontinuu la orice pas și bombardând React-ul cu procesări grafice (suplimentat și de bug-ul stilizării `height: 'auto'` specific Android native).
* **Soluția:** A fost scoasă în afară arborelui de rendering (statică) și denumită `globalToastConfig`, reparând tot freeze-ul definitiv din `App.js`. Omiterea `height: auto` a asigurat funcționarea netedă pe telefoane de nivel low-end.

---

## 4. Mentenanța Proiectului: Dependențe & Pachete (`node_modules`)
Dacă proiectul refuză să treacă de verificările de siguranță (`npx expo doctor` / duplicate de module / erori fatale CNG la folderul de `/android`), secvența strictă de salvare este următoarea din terminalul rădăcină (`/frontend/`):

1. Șterge dependințele complet (inclusiv cache și erori native locale):
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
Remove-Item -Recurse -Force android
```
2. Instalează-le și repară erorile de compatibilitate din mașinărie:
```bash
npm install
npm install tailwindcss@3.3.2 --save-exact
npx expo install --fix
npm dedupe
```

*(npm dedupe este obligatoriu folosit pentru eliminarea fișierelor clonă făcute accidental, cum a fost la modulul expo-constants).*