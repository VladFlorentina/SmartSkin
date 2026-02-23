# CosmetiSafe - Smart Cosmetic Analyzer

Aplicatie mobila pentru analiza toxicitatii produselor cosmetice, construita cu React Native si AI.
Proiect de licenta - 2025/2026.

## Despre proiect

CosmetiSafe permite scanarea codului de bare al unui produs cosmetic pentru a afla rapid daca
ingredientele sunt sigure sau nu. Aplicatia interpreteaza lista INCI folosind baza de date CosIng
a Comisiei Europene si un algoritm propriu de calcul al riscului chimic.

Daca produsul nu se gaseste in baze de date, utilizatorul poate fotografia eticheta din aplicatie.
Modelul AI (Google Gemini) extrage automat lista INCI si o analizeaza.

## Functionalitati

- Scanare coduri de bare EAN-13 / UPC cu camera telefonului
- OCR pe eticheta produsului via Google Gemini 2.5 Flash
- Algoritm de scoring (0-100) bazat pe CosIng (~30.000 ingrediente INCI)
- Scor animat cu ring SVG (verde / galben / rosu)
- Scor personalizat in functie de tipul de piele si alergiile declarate
- Chatbot integrat (CosmetiBot) pentru intrebari despre ingrediente
- Cache comunitar - un produs analizat odata devine disponibil instant pentru toti
- Istoric personal de scanari
- Ecran de eroare dedicat la lipsa conexiunii cu serverul (timeout 12s + retry)

## Stack tehnologic

### Frontend
- React Native + Expo SDK 54
- JavaScript (ES Modules)
- NativeWind (Tailwind CSS pentru mobil)
- React Navigation (Native Stack)
- expo-camera (scanare barcode EAN-13/UPC si captura OCR)
- react-native-svg + react-native-reanimated (animatia ring-ului de scor)

### Backend
- Node.js + Express.js
- Supabase (PostgreSQL cloud) - autentificare, baza de date, RLS
- Google Gemini 2.5 Flash - OCR si chatbot
- Open Beauty Facts API - metadata produse (nume, brand, imagine)
- express-rate-limit - protectie endpoints
- Jest - 45 teste unitare pentru algoritmul de toxicitate
- Swagger UI la `/api-docs`

### Baza de date ingrediente
- Sursa: CosIng - Cosmetic Ingredients Database, Comisia Europeana
- ~30.000 ingrediente INCI cu toxicitate, functie si restrictii UE
- Acoperire: Anexa II (interzise), III (restrictionate), IV (coloranti), V (conservanti), VI (filtre UV)

## Structura proiectului

```
SmartSkin/
  backend/
    src/
      app.js              - server principal si middleware
      config/             - Supabase, Swagger
      controllers/        - logica endpoints (product, AI)
      middleware/         - autentificare JWT (required + optional)
      routes/             - rute API cu documentatie Swagger
      services/           - toxicityAnalyzer, geminiService, openBeautyFacts
    __tests__/            - teste Jest (45 teste unitare)
  frontend/
    src/
      screens/            - Scanner, Product, Chat, History, Profile, ManualAdd etc.
      components/         - Button, Input, Layout, AnimatedScoreRing, ErrorBoundary
      lib/                - API client, Supabase config
      navigation/         - stive de navigare (AuthStack + AppStack)
  date_curatate_UE/       - CSV-uri cu ingredientele din Anexele II-VI UE
```

## Rulare locala

### Cerinte
- Node.js >= 18
- Expo Go pe telefon (sau emulator Android/iOS)
- Cont Supabase
- Google Gemini API Key

### Backend
```bash
cd backend
cp .env.example .env    # completeaza cu cheile tale
npm install
npm run dev             # server pornit la http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```

Seteaza IP-ul PC-ului in `frontend/app.json` -> `extra.backendIp` (telefonul si PC-ul trebuie
pe aceeasi retea Wi-Fi).

### Teste
```bash
cd backend
npm test    # 45 teste unitare Jest
```

---

Proiect de licenta - Florentina
