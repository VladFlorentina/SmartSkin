-- ============================================================
-- Migrare: Creare tabel user_allergies
-- Rezolva incalcarea 1NF din user_profiles (allergies TEXT)
-- Fiecare alergie devine un rand separat cu FK catre user_profiles
--
-- Ruleaza in Supabase -> SQL Editor
-- ============================================================


-- ============================================================
-- PASUL 1: Creare tabel user_allergies
-- ============================================================
CREATE TABLE IF NOT EXISTS user_allergies (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    allergy_label TEXT NOT NULL,  -- Ex: 'Parfum / Fragrance', 'Parabeni', 'Sulfati (SLS/SLES)'
    UNIQUE(user_id, allergy_label)
);

-- Index pentru cautari rapide dupa utilizator
CREATE INDEX IF NOT EXISTS idx_user_allergies_user_id ON user_allergies(user_id);


-- ============================================================
-- PASUL 1.5: Migrare date din coloana TEXT in tabelul nou
-- ============================================================
DO $$
DECLARE
    rec RECORD;
    allergy_item TEXT;
BEGIN
    FOR rec IN 
        SELECT id, allergies 
        FROM user_profiles 
        WHERE allergies IS NOT NULL AND TRIM(allergies) <> '' 
    LOOP
        -- Presupunem ca alergiile sunt separate prin virgula
        FOREACH allergy_item IN ARRAY string_to_array(rec.allergies, ',') LOOP
            INSERT INTO user_allergies (user_id, allergy_label)
            VALUES (rec.id, TRIM(allergy_item))
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;


-- ============================================================
-- PASUL 2: Row Level Security
-- Utilizatorul poate vedea si modifica doar propriile alergii
-- ============================================================
ALTER TABLE user_allergies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own allergies" ON user_allergies;
CREATE POLICY "Users can view own allergies"
    ON user_allergies FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own allergies" ON user_allergies;
CREATE POLICY "Users can insert own allergies"
    ON user_allergies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own allergies" ON user_allergies;
CREATE POLICY "Users can delete own allergies"
    ON user_allergies FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- PASUL 3: Eliminare coloana allergies TEXT din user_profiles
-- (nu mai este necesara - datele sunt acum in user_allergies)
-- ============================================================
ALTER TABLE user_profiles RENAME COLUMN allergies TO allergies_old;


-- ============================================================
-- PASUL 4: Verificare structura finala
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
