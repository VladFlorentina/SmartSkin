# Jurnal de Probleme si Bug-uri (SmartSkin)

Acest document tine evidenta tuturor problemelor tehnice, arhitecturale si de retea intampinate in timpul dezvoltarii aplicatiei CosmetiSafe, precum si a solutiilor implementate (sau a stadiului curent pentru cele nerezolvate).

## 1. Problema "Produselor Fantoma" din Open Beauty Facts (Rezolvata)
**Descriere:** 
Cand un utilizator scana anumite coduri de bare (ex: un sampon Yves Rocher - `3660005659473`), aplicatia primea raspuns de pe serverul public Open Beauty Facts cu status "Gasit" (status 1). Totusi, payload-ul JSON era complet gol in ceea ce priveste numele si lista de ingrediente (`ingredients_text`).
Backend-ul nostru salva acest produs "fantoma" in baza de date Supabase si ii acorda scorul 0/100 cu 0 ingrediente, derutand utilizatorul.

**Solutie (Implementata):**
Am modificat fisierul `openBeautyFacts.js` de pe backend pentru a face o validare de integritate. Chiar daca produsul e validat de API, daca `ingredients_text` lipseste sau e gol, fortam o eroare HTTP 404 (Not Found). Acest lucru declanseaza instantaneu pe frontend ecranul de **"Produs Negasit"**, permitand utilizatorului sa foloseasca scanerul OCR (Gemini AI).

## 2. Eroarea de retea (Network Request Failed / EADDRINUSE / JSON Parse Error) (Rezolvata)
**Descriere:**
Aplicatia dezvoltata cu Expo depinde de comunicarea in reteaua locala (WLAN) cu serverul Node.js. Din cauza reinnoirii contractului DHCP (Lease) de catre router-ul Wi-Fi, adresa de IP a laptop-ului (serverului) s-a schimbat, rupand conexiunea. In plus, pornirea repetata manuala a serverului folosind `npm start` dadea `EADDRINUSE` pe portul 3000 pentru ca procesul Node.js rulase deja in background, mentinand portul ocupat. Cererile esuate rezultau intr-o pagina HTML de "firewall/dead-end", pe care aplicatia incerca sa o citeasca drept JSON.

**Solutie (Implementata):**
- Terminarea fortata (Force Kill) a proceselor "zombie" de Node.js din consola folosind comenzile OS (`taskkill /F /IM node.exe`).
- Reconfigurarea manuala si corecta in fisierul `frontend/src/lib/api.js` a IP-ului laptopului (`192.168.100.26`) si reincarcarea fortata (hot-reload `r`) a bundle-ului de Expo.

## 3. Pierderea Codului de Bare la Scanarea Manuala OCR (Rezolvata)
**Descriere:**
Atunci cand aplicatia nu gasea un produs, oferea utilizatorului optiunea "Adauga produs manual (OCR)". In acest ecran, aplicatia "uita" codul de bare scanat initial. Dupa analiza, produsul era salvat in cloud sub un cod generat automat de tipul `MANUAL-X12345`. Cand utilizatorul scana fizic sticla din nou in zilele urmatoare, aplicatia dadea iar "Produs Negasit" (deoarece numarul EAN real nu exista in DB).

**Solutie (Implementata):**
In `App.js` si `ManualAddScreen.js`, stocam codul de bare original direct in _state_ (props). Cand utilizatorul trimite formularul OCR, aplicatia asociaza fortat ingredientele obtinute de Inteligenta Artificiala cu codul EAN/UPC fizic original si le trimite astfel catre server pentru salvare.

## 4. Conflict la Salvarea in Baza de Date (Eroare Postgres 23505) (Rezolvata)
**Descriere:**
Cand backend-ul primea detaliile extrase prin OCR si incerca sa le salveze (`supabase.insert()`), baza de date dadea coliziune (`products_barcode_key` conflict). Cauza era ca variantele mai vechi "fantoma" ale produsului (mentionate la punctul 1) erau deja in baza de date pe acel cod de bare, dar complet goale.

**Solutie (Implementata):**
S-a refactorizat logica din `productController.js` pentru a folosi comanda Supabase `.upsert({ data }, { onConflict: 'barcode' })`. Astfel, daca codul de bare exista deja (chiar si avand date incomplete), backend-ul _suprascrie/actualizeaza_ linia din tabela cu raportul complet generat de Inteligenta Artificiala.

## 5. Algoritmul INCI - Scaderea agresiva a scorului la 0/100 (Problema CURENTA - Nerezolvata)
**Descriere:**
Algoritmul initial de punctare din `toxicityAnalyzer.js` scadea pur si simplu cate x puncte per ingredient nociv. Acest lucru crea situatii in care prezenta unui "banned ingredient" combinata cu 20 de "ingrediente sigure" dadea un scor mediu prea favorabil (ex: nota 84, desi produsul era toxic).
La cererea utilizatorului, am rescris **algoritmul stil-INCI Beauty**, unde:
- Scorul are un *Plafon Maxim (Cap)* bazat pe pricipiul celui mai nociv ingredient (ex: daca ai 1 compus de Risc 4, scorul tau total niciodata nu poate depasi matematic 45/100).
- Se aplica penalizari combinate (Cocktail effect).

**Stadiul Curent:** Desi implementarea tehnica a fost efectuata, utilizatorul raporteaza ca rezultatul analizelor manuale (OCR) returneaza constant nota finala `0/100`, indicand fie un factor matematic prea restrictiv in algoritm, fie erori de _matching_ in dictionar, fie date returnate incorect de modelul Gemini OCR. Urmeaza debugging direct pe rezultatul `score`.
