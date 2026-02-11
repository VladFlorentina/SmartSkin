-- ============================================
-- UPDATE: Permite inserarea de produse noi
-- ============================================

-- Sterge policy-ul vechi daca exista (doar read-only)
DROP POLICY IF EXISTS "Public read access to products" ON products;

-- 1. Permite oricui sa citeasca produse (SELECT)
CREATE POLICY "Public read access to products"
  ON products FOR SELECT
  USING (true);

-- 2. Permite inserarea de produse noi (INSERT) pentru oricine (anon sau autentificat)
-- Motiv: Backend-ul foloseste anon key, si trebuie sa poata salva produse noi din OpenBeautyFacts
CREATE POLICY "Enable insert for all users"
  ON products FOR INSERT
  WITH CHECK (true);

-- 3. Permite update (optional, pentru a actualiza datele produselor)
CREATE POLICY "Enable update for all users"
  ON products FOR UPDATE
  USING (true);
