# Probleme intampinate si solutii - CosmetiSafe

Documentatie tehnica a problemelor si bug-urilor aparute in timpul dezvoltarii,
cu solutiile implementate.

---

## 1. Produse "fantoma" de pe Open Beauty Facts

**Problema:**
La scanarea unor coduri de bare (ex: sampon Yves Rocher - `3660005659473`), Open Beauty Facts
returna status "gasit" dar payload-ul era gol - fara nume si fara `ingredients_text`.
Backend-ul salva produsul gol in Supabase si ii acorda scorul 0/100 cu 0 ingrediente.

**Solutie:**
Am adaugat o validare de integritate in `openBeautyFacts.js`. Daca `ingredients_text` lipseste
dupa ce produsul a trecut de verificarea de status, fortam HTTP 404. Asta declanseaza
pe frontend ecranul "Produs Nou Detectat!" si permite utilizatorului sa foloseasca OCR.

---

## 2. Erori de retea (Network Request Failed / EADDRINUSE)

**Problema:**
Aplicatia Expo comunica cu serverul Node.js prin retea locala (WLAN). Dupa reinnoire DHCP,
IP-ul laptopului se schimba si conexiunea se rupe. In plus, pornirea repetata a serverului
dadea `EADDRINUSE` pe portul 3000 din cauza proceselor Node.js ramase in background.
Cererile esuate returnau HTML de la firewall, pe care aplicatia incerca sa il parse ca JSON.

**Solutie:**
- Terminarea fortata a proceselor zombie: `taskkill /F /IM node.exe`
- IP-ul backend-ului se configureaza in `app.json` -> `extra.backendIp` (nu mai e hardcodat in cod)
- Adaugat timeout de 12 secunde si ecran de eroare dedicat ("Fara Conexiune") in ProductScreen

---

## 3. Pierderea codului de bare la scanarea manuala OCR

**Problema:**
Cand aplicatia nu gasea un produs, oferea optiunea "Adauga manual (OCR)". In ManualAddScreen,
codul de bare original era pierdut. Produsul era salvat cu un cod generat automat (`MANUAL-X12345`).
La rescansare, produsul nu era gasit in DB pentru ca EAN-ul real nu exista.

**Solutie:**
Codul de bare original e transmis prin `navigation.replace('ManualAdd', { barcode: ... })` si
asociat cu produsul OCR inainte de trimitere la server.

---

## 4. Conflict la salvare in baza de date (Postgres 23505)

**Problema:**
Cand backend-ul incerca sa salveze rezultatul OCR, baza de date dadea coliziune pe
`products_barcode_key` - varianta "fantoma" a produsului era deja in DB.

**Solutie:**
Refactorizat `productController.js` pentru a folosi `.upsert({ data }, { onConflict: 'barcode' })`.
Daca codul de bare exista deja (chiar si cu date incomplete), randurile sunt suprascrise cu
raportul complet.

---

## 5. Algoritm INCI - scadere agresiva a scorului la 0/100

**Problema:**
Algoritmul initial scadea un numar fix de puncte per ingredient nociv. Asta ducea la situatii
in care un singur ingredient interzis combinat cu 20 de ingrediente sigure dadea un scor
nejustificat de favorabil.

**Solutie:**
Am rescris algoritmul cu un sistem de plafoane (score cap):
- Ingredientul cu riscul cel mai mare limiteaza scorul maxim posibil
- Penalizari combinate pentru cocktail effect
- Position multiplier pentru primele 5 ingrediente din lista INCI

---

## 6. Compatibilitate expo-barcode-scanner deprecat

**Problema:**
Pachetul `expo-barcode-scanner` a fost marcat deprecated in Expo SDK 52+.

**Solutie:**
Migrat la `expo-camera` (CameraView) care include functionalitatea de scanare barcode nativ.
`ScannerScreen.js` foloseste `<CameraView onBarcodeScanned={...} barcodeScannerSettings={...}>`.

---

## 7. react-native-reanimated incompatibil cu Expo SDK 54

**Problema:**
Versiunea 4.2.1 de `react-native-reanimated` nu era compatibila cu Expo SDK 54,
producand erori la pornire.

**Solutie:**
Downgrade la versiunea 4.1.6 cu `npx expo install react-native-reanimated`.
