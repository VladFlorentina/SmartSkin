# 🧪 Backend Testing Script

## Test 1: Health Check
**Endpoint:** `GET /api/health`
**Expected:** Server status + Supabase connection

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
```

---

## Test 2: Search BANNED Ingredient
**Endpoint:** `GET /api/test-ingredient?name=triclosan`
**Expected:** score = -10, INTERZIS

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/test-ingredient?name=triclosan"
```

---

## Test 3: Search SAFE Ingredient
**Endpoint:** `GET /api/test-ingredient?name=aqua`
**Expected:** score = 0, admis

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/test-ingredient?name=aqua"
```

---

## Test 4: Analyze Product (Complex)
**Endpoint:** `POST /api/products/analyze`
**Payload:**
```json
{
  "ingredients": "Aqua, Glycerin, Triclosan, Parabens, Citric Acid"
}
```

**Expected:** 
- Safety score calculat
- Warning pentru Triclosan (INTERZIS)
- Warning pentru Parabens (RESTRICȚIONAT)

```powershell
$body = @{
  ingredients = "Aqua, Glycerin, Triclosan, Parabens, Citric Acid"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/products/analyze" -Method POST -Body $body -ContentType "application/json"
```

---

## Test 5: Get Product by Barcode
**Endpoint:** `GET /api/products/3574661367057`
**Expected:** Produs din baza de date sau mesaj de eroare

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/products/3574661367057"
```

---

## Test 6: Supabase Direct Test
**Script:** `test-supabase.js`
**Expected:** 2,377 ingrediente

```powershell
node test-supabase.js
```
