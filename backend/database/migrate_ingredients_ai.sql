-- ============================================================
-- Migrare: Suport pentru inserare ingrediente noi de catre AI
-- Ruleaza in Supabase -> SQL Editor
-- ============================================================

-- Pas 1: Creeaza o secventa care porneste de dupa ID-urile din CSV (max = 30080)
CREATE SEQUENCE IF NOT EXISTS ingredients_id_seq START WITH 30081 INCREMENT BY 1;

-- Pas 2: Seteaza coloana id sa foloseasca secventa pentru randuri noi
--         (randurile existente din CSV isi pastreaza ID-urile)
ALTER TABLE ingredients
    ALTER COLUMN id SET DEFAULT nextval('ingredients_id_seq');

-- Pas 3: Adauga constrangere UNIQUE pe inci_name (necesara pentru upsert ON CONFLICT)
--         Daca exista deja duplicate in CSV-ul tau, comanda de mai jos le va gasi:
--         SELECT inci_name, COUNT(*) FROM ingredients GROUP BY inci_name HAVING COUNT(*) > 1;
ALTER TABLE ingredients
    ADD CONSTRAINT ingredients_inci_name_unique UNIQUE (inci_name);

-- Pas 4: Index pentru cautari case-insensitive (optional, dar accelereaza ilike queries)
CREATE INDEX IF NOT EXISTS idx_ingredients_inci_name_lower
    ON ingredients (LOWER(inci_name));

-- Verificare: afiseaza structura finala
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ingredients'
ORDER BY ordinal_position;
