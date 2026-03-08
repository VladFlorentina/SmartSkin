-- ============================================
-- CosmetiSafe Database Schema pentru Supabase
-- ============================================
-- NOTA: Tabelul 'ingredients' este deja populat cu ~2,500 ingrediente din datele UE
-- Acest script este doar pentru referinta si pentru crearea tabelelor suplimentare
-- ============================================

-- ========== Tabel: products ==========
-- Stocheaza produse cosmetice (cache de la Open Beauty Facts)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  ingredients_list TEXT, -- Lista INCI bruta
  image_url TEXT,
  category TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pentru cautare rapida dupa barcode
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- ========== Tabel: ingredients ==========
-- Dictionar complet CosIng (~30,000 ingrediente INCI din UE)
-- Structura: id, inci_name (text), score (integer), description (text), Restriction (text), Function (text)
-- Scoruri: -10 (interzis, Anexa II), -5 (restrictionat, Anexa III), 0 (colorant/conservant admis, Anexa IV/V), 
--           5 (filtru UV admis, Anexa VI), 10 (safe, fara restrictii)
-- NOTA: Acest tabel este populat cu date din inventarul CosIng (EU) - fisierul db_ingrediente_final_corect.csv

-- ========== Tabel: scanned_products ==========
-- Istoric de scanari pentru fiecare utilizator
CREATE TABLE IF NOT EXISTS scanned_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  scan_count INTEGER DEFAULT 1 NOT NULL  -- De cate ori a scanat userul acest produs
);

-- Index pentru queries rapide
CREATE INDEX IF NOT EXISTS idx_scanned_products_user ON scanned_products(user_id);
CREATE INDEX IF NOT EXISTS idx_scanned_products_date ON scanned_products(scanned_at DESC);
-- Unicitate: un user poate avea un produs o singura data in istoric (scan_count creste)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scanned_products_unique ON scanned_products(user_id, product_id);

-- ========== Tabel: ai_conversations ==========
-- Istoric conversatii cu chatbot-ul AI
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  message TEXT NOT NULL, -- Intrebarea utilizatorului
  response TEXT NOT NULL, -- Raspunsul AI-ului
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pentru istoric chat
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_product ON ai_conversations(product_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS pe tabelele noi
ALTER TABLE scanned_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Policy: Users pot vedea doar propriile scanari
DROP POLICY IF EXISTS "Users can view own scanned products" ON scanned_products;
CREATE POLICY "Users can view own scanned products"
  ON scanned_products FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scanned products" ON scanned_products;
CREATE POLICY "Users can insert own scanned products"
  ON scanned_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scanned products" ON scanned_products;
CREATE POLICY "Users can update own scanned products"
  ON scanned_products FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own scanned products" ON scanned_products;
CREATE POLICY "Users can delete own scanned products"
  ON scanned_products FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users pot vedea doar propriile conversatii AI
DROP POLICY IF EXISTS "Users can view own AI conversations" ON ai_conversations;
CREATE POLICY "Users can view own AI conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI conversations" ON ai_conversations;
CREATE POLICY "Users can insert own AI conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI conversations" ON ai_conversations;
CREATE POLICY "Users can delete own AI conversations"
  ON ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Products si ingredients sunt publice (read-only pentru toti)
DROP POLICY IF EXISTS "Public read access to products" ON products;
CREATE POLICY "Public read access to products"
  ON products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read access to ingredients" ON ingredients;
CREATE POLICY "Public read access to ingredients"
  ON ingredients FOR SELECT
  USING (true);

-- ============================================
-- DONE! Schema actualizata
-- ============================================
