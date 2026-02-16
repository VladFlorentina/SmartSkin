-- ============================================
-- Script pentru User Profiles si Actualizari Ingrediente
-- Ruleaza acest script in Supabase SQL Editor
-- ============================================

-- 1. Tabel: user_profiles
-- Extinde functionalitatea auth.users cu date specifice aplicatiei
-- Reflecta entitatile "Utilizator", "Preferinte" si "Rol" din diagrama UML
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- Copie optionala pentru query-uri rapide
  full_name TEXT,
  skin_type TEXT, -- Ex: 'gras', 'uscat', 'mixt', 'normal', 'sensibil'
  allergies TEXT, -- Ex: 'nuci, parfum, gluten'
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pentru cautare rapida
CREATE INDEX IF NOT EXISTS idx_profiles_role ON user_profiles(role);

-- 2. Trigger pentru creare automata profil
-- Cand un user nou se inregistreaza (auth.users), se creeaza automat o intrare in user_profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Atasare trigger la auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Actualizare Tabel: ingredients
-- Adaugam informatii despre sursa stiintifica (conform entitatii SursaStiintifica din UML)
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS source_name TEXT,
ADD COLUMN IF NOT EXISTS source_link TEXT;

-- 4. RLS Policies pentru user_profiles

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Userul isi poate vedea propriul profil
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Userul isi poate actualiza propriul profil
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Adminii pot vedea toate profilele (optional, pentru viitor)
-- CREATE POLICY "Admins can view all profiles"
--   ON user_profiles FOR SELECT
--   USING (auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin'));

-- ============================================
-- DONE! Schema User Profiles creata
-- ============================================
