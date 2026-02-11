-- ============================================
-- CosmetiSafe Database Schema pentru Supabase
-- ============================================
-- NOTĂ: Tabelul 'ingredients' este deja populat cu ~2,500 ingrediente din datele UE
-- Acest script este doar pentru referință și pentru crearea tabelelor suplimentare
-- ============================================

-- ========== Tabel: products ==========
-- Stochează produse cosmetice (cache de la Open Beauty Facts)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  ingredients_list TEXT, -- Lista INCI brută
  image_url TEXT,
  category TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pentru căutare rapidă după barcode
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- ========== Tabel: ingredients ==========
-- DEJA EXISTENT - Dicționar de toxicitate pentru ingrediente
-- Structura: name (text), score (integer), description (text)
-- Scoruri: -10 (interzis UE), -5 (restricționat UE), 0 (admis UE)
-- NOTĂ: Acest tabel este deja populat cu date din CosIng (EU)

-- ========== Tabel: scanned_products ==========
-- Istoric de scanări pentru fiecare utilizator
CREATE TABLE IF NOT EXISTS scanned_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE
);

-- Index pentru queries rapide
CREATE INDEX IF NOT EXISTS idx_scanned_products_user ON scanned_products(user_id);
CREATE INDEX IF NOT EXISTS idx_scanned_products_date ON scanned_products(scanned_at DESC);

-- ========== Tabel: ai_conversations ==========
-- Istoric conversații cu chatbot-ul AI
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  message TEXT NOT NULL, -- Întrebarea utilizatorului
  response TEXT NOT NULL, -- Răspunsul AI-ului
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

-- Policy: Users pot vedea doar propriile scanări
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

-- Policy: Users pot vedea doar propriile conversații AI
DROP POLICY IF EXISTS "Users can view own AI conversations" ON ai_conversations;
CREATE POLICY "Users can view own AI conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI conversations" ON ai_conversations;
CREATE POLICY "Users can insert own AI conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Products și ingredients sunt publice (read-only pentru toți)
DROP POLICY IF EXISTS "Public read access to products" ON products;
CREATE POLICY "Public read access to products"
  ON products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read access to ingredients" ON ingredients;
CREATE POLICY "Public read access to ingredients"
  ON ingredients FOR SELECT
  USING (true);

-- ============================================
-- DONE! Schema actualizată
-- ============================================
