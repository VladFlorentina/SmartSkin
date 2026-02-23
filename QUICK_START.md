# Quick Start - CosmetiSafe

Ghid rapid pentru pornirea proiectului.

## Configurare backend

### 1. Seteaza variabilele de mediu

```bash
cd backend
copy .env.example .env
```

Editeaza `.env` si completeaza:

```env
SUPABASE_URL=url_proiect_tau_supabase
SUPABASE_ANON_KEY=cheia_anon_de_la_settings_api
SUPABASE_SERVICE_ROLE_KEY=cheia_service_role
GEMINI_API_KEY=cheia_google_gemini
PORT=3000
NODE_ENV=development
```

Cheile Supabase se gasesc in **Dashboard -> Settings -> API**.
Nu folosi service_role in frontend, doar in backend.

### 2. Instaleaza dependentele si porneste serverul

```bash
npm install
npm run dev
```

Serverul porneste la `http://localhost:3000`.
Documentatie API disponibila la `http://localhost:3000/api-docs`.

### 3. Verifica ca functioneaza

```
http://localhost:3000/api/health
```

Raspuns asteptat: `{ "status": "ok" }`

### 4. Ruleaza testele

```bash
npm test
```

45 teste unitare Jest pentru algoritmul de toxicitate.

---

## Configurare frontend

### 1. Seteaza IP-ul backend-ului

Deschide `frontend/app.json` si seteaza IP-ul PC-ului tau (nu localhost - telefonul e pe alta masina):

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

Gasesti IP-ul cu `ipconfig` pe Windows (IPv4 de la Wi-Fi).
Telefonul si PC-ul trebuie sa fie pe aceeasi retea Wi-Fi.

### 2. Instaleaza si porneste

```bash
cd frontend
npm install
npx expo start
```

Scaneaza codul QR cu Expo Go (Android) sau Camera app (iOS).

---

## Probleme frecvente

**`EADDRINUSE` la pornirea serverului:**
Un proces Node.js a ramas in background. Ruleaza `taskkill /F /IM node.exe` si reincearca.

**`Network Request Failed` in aplicatie:**
IP-ul din `app.json` nu mai e valid (DHCP). Ruleaza `ipconfig`, actualizeaza `backendIp` si
restartati Expo cu `r` in terminal.

**Serverul nu raspunde dupa 12 secunde:**
Aplicatia afiseaza ecranul "Fara Conexiune" cu buton de retry. Verifica ca serverul ruleaza
si ca e pe aceeasi retea.
