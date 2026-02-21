# SmartSkin
Smart Cosmetic Analyzer - Aplicatie mobila pentru analiza toxicitatii produselor (React Native & AI)

# CosmetiSafe - Smart Cosmetic Analyzer

> **Aplicatie mobila pentru analiza toxicitatii produselor cosmetice utilizand Inteligenta Artificiala.**
> *Proiect de Licenta - 2025*

## Descriere Generala
**CosmetiSafe** este o solutie software cross-platform (Android & iOS) destinata consumatorilor constienti de sanatatea lor. Aplicatia permite scanarea codurilor de bare de pe produsele cosmetice si de ingrijire personala pentru a decodifica lista de ingrediente (INCI).

Spre deosebire de alte aplicatii, CosmetiSafe nu doar listeaza ingredientele, ci le interpreteaza contextul utilizand algoritmi de calcul al riscului chimic si modele de Inteligenta Artificiala Generativa (LLM) pentru a oferi explicatii clare si recomandari personalizate.

## Functionalitati Cheie
* **Scanare Instantanee:** Recunoasterea codurilor de bare EAN-13/UPC utilizand camera telefonului.
* **Analiza INCI:** Descompunerea listei de ingrediente si identificarea substantelor cu risc (alergeni, disruptori endocrini, cancerigeni).
* **Scoring Algoritmic:** Calcularea unui scor de siguranta (0-100) bazat pe toxicitatea cumulativa a ingredientelor.
* **AI Assistant (CosmetiBot):** Chatbot integrat care raspunde la intrebari precum *"De ce acest produs nu este recomandat pentru tenul sensibil?"*.
* **Istoric Personal:** Salvarea produselor scanate pentru consultare ulterioara.

## Stack Tehnologic (Arhitectura)

### Client Side (Mobile App)
* **Framework:** React Native (via Expo SDK 52)
* **Limbaj:** TypeScript
* **UI/UX:** NativeWind (Tailwind CSS pentru mobil)
* **Navigare:** Expo Router

### Backend & Data
* **Database:** Supabase (PostgreSQL Cloud) - stocare utilizatori si dictionar de toxicitate.
* **Auth:** Supabase Authentication.
* **External API:** Open Beauty Facts API (sursa datelor despre produse).

### Inteligenta Artificiala
* **Engine:** Google Gemini API / Groq (Llama 3).
* **Rol:** Generare explicatii in limbaj natural si analiza contextuala a ingredientelor.

## Fluxul de Date (High Level)
1.  **User** scaneaza produsul -> App extrage codul de bare.
2.  **App** interogheaza *Open Beauty Facts* pentru lista de ingrediente.
3.  **App** compara ingredientele cu baza de date *Supabase* pentru a obtine scorurile de risc.
4.  **Algoritmul** calculeaza nota finala.
5.  (Optional) **AI-ul** genereaza un rezumat explicativ pentru utilizator.

## Status Proiect
**In Dezvoltare (Faza de Testare & Debugging AI).**

*Ce am finalizat recent:*
- **Modulul OCR (Adaugare Manuala):** Utilizatorii au acum capacitatea de a poza eticheta de ingrediente cu camera, iar modelul generativ Google Gemini (`gemini-2.5-flash`) descompune textul chimic intr-un format analizabil. Solutia repara deficientele bazei de date globale "Open Beauty Facts" unde mii de produse sunt inregistrate fara liste de ingrediente.
- **Scoring Algoritmic (Stil INCI Beauty):** Am facut tranzitia de la un scor liniar (medie matematica permisiva) la un sistem guvernat de **penalizare prin plafon maxim (Cap Effect)**. Un singur ingredient interzis plafoneaza intregul produs la scor sub 45/100, indiferent de cantitatea de elemente sigure "filler" (apa, glicerina).
- **Tratarea Problemelor OBF (Ghost Products):** Sistemul a fost securizat arhitectural prin tehnici `upsert` si rutare asertiva 404 (vezi arhiva problemelor).

> **Atentie:** Un jurnal tehnic aprofundat al tuturor erorilor de backend, networking, frontend status si limitari API (inclusiv detalii despre bug-ul curent al Scorului Generat 0) poate fi consultat in noul document **[PROBLEME.md](./PROBLEME.md)**.

---
*Developed by Vlad & Florentina*