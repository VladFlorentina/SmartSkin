# CosmetiSafe - Frontend

Aplicatia mobila React Native (Expo SDK 54) pentru SmartSkin / CosmetiSafe.

---

## Tehnologii folosite

- React Native + Expo SDK 54
- JavaScript (ES Modules)
- NativeWind (Tailwind CSS pentru mobil) - stilizare cu `className="..."`
- React Navigation (Native Stack)
- expo-camera - scanare barcode si captura pentru OCR
- react-native-svg + react-native-reanimated - animatia ring-ului de scor
- Supabase - autentificare si stocare date utilizator

---

## Ecrane

| Ecran | Fisier | Descriere |
|-------|--------|-----------|
| Login | LoginScreen.js | Autentificare cu email + parola |
| Register | RegisterScreen.js | Creare cont nou |
| Scanner | ScannerScreen.js | Camera pentru scanare EAN-13 / UPC |
| Product | ProductScreen.js | Scor animat, ingrediente, alerte personale, OCR prompt |
| ManualAdd | ManualAddScreen.js | Fotografie eticheta + trimitere OCR la backend |
| Chat | ChatScreen.js | Conversatie cu CosmetiBot despre produsul scanat |
| History | HistoryScreen.js | Lista produse scanate anterior |
| Profile | ProfileScreen.js | Tip de piele, alergii comune, sign out |

---

## Fluxuri principale

### Autentificare

Email + parola -> Supabase returneaza JWT. Token-ul e pastrat local (AsyncStorage).
Navigarea comuta automat intre AuthStack si AppStack in functie de sesiune.

### Scanare produs

1. Userul scaneaza un cod de bare cu CameraView
2. Aplicatia trimite codul la `GET /api/products/:barcode` (cu headers de autentificare optional)
3. Trei scenarii:
   - Cache hit: produsul exista in DB -> rezultat instant
   - OBF hit: Open Beauty Facts are ingredientele -> analiza + salvare in cache
   - needsOcr: backend returneaza `needsOcr: true` -> ecran "Produs Nou Detectat!"
4. Se afiseaza scorul animat (ring cu animatie SVG), ingredientele colorate si eventualele alerte

### OCR

Utilizatorul fotografiaza eticheta. Imaginea e trimisa la `POST /api/products/manual`.
Backend-ul o proceseaza cu Gemini AI, extrage INCI-ul, analizeaza si salveaza in cache.

### Personalizare

Daca userul e autentificat si are profil completat (tip piele + alergii), backend-ul
returneaza `personalWarnings[]` si un scor ajustat. Aplicatia afiseaza sectiunea
"Alerte Personale" (rosu) deasupra avertismentelor generale.

### Offline

Daca serverul nu raspunde in 12 secunde, se afiseaza ecranul "Fara Conexiune" cu
mesaj explicativ si buton de retry. Nu mai exista crash sau loading infinit.

---

## Componente reutilizabile

| Componenta | Descriere |
|------------|-----------|
| Button.js | Buton stilizat, variante: default si outline |
| Input.js | Camp text cu label |
| Layout.js | SafeAreaView cu padding consistent |
| AnimatedScoreRing.js | Ring SVG animat cu react-native-reanimated, verde/galben/rosu |
| ErrorBoundary.js | Catch React errors si afiseaza fallback UI |

---

## Configurare IP backend

In `app.json`, seteaza IP-ul PC-ului tau:

```json
{
  "expo": {
    "extra": {
      "backendIp": "192.168.X.X",
      "backendPort": "3000"
    }
  }
}
```

Telefonul si PC-ul trebuie sa fie pe aceeasi retea Wi-Fi.
IP-ul se gaseste cu `ipconfig` pe Windows (IPv4 -> Wi-Fi).

---

## Cum rulezi

```bash
npm install
npx expo start
```

Scaneaza codul QR cu Expo Go (Android) sau Camera app (iOS).
