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
**In Dezvoltare.**
Configurarea mediului de lucru si arhitectura backend sunt finalizate. Urmeaza implementarea modulelor de scanare.

---
*Developed by Vlad & Florentina*