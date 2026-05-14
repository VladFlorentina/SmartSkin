-- ============================================================
-- Migrare: Creare tabel de jonctiune product_ingredients
-- Rezolva incalcarea 1NF din tabelul products (ingredients_list TEXT)
-- si creeaza legatura explicita intre tabela ingredients si products
--
-- Ruleaza in Supabase -> SQL Editor
-- ============================================================


-- ============================================================
-- PASUL 1: Creare tabel de jonctiune
-- ============================================================
CREATE TABLE IF NOT EXISTS product_ingredients (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID    NOT NULL REFERENCES products(id)     ON DELETE CASCADE,
    ingredient_id INT     NOT NULL REFERENCES ingredients(id)  ON DELETE CASCADE,
    position      INT     DEFAULT NULL, -- ordinea in lista INCI (pozitia 0 = concentratie maxima)
    UNIQUE(product_id, ingredient_id)
);

-- Index pentru cautari rapide dupa produs sau dupa ingredient
CREATE INDEX IF NOT EXISTS idx_pi_product_id    ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_pi_ingredient_id ON product_ingredients(ingredient_id);


-- ============================================================
-- PASUL 1b: Index functional pentru viteza maxima la migrare
-- UPPER(inci_name) pe ~30.000 randuri fara index = full-scan la fiecare token
-- Cu index = cautare instantanee (B-tree pe valoarea uppercase precalculata)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ingredients_inci_name_upper
    ON ingredients (UPPER(inci_name));


-- ============================================================
-- PASUL 2: Populare automata din datele existente
-- Parcurgem fiecare produs din cache care are ingredients_list
-- si potrivim fiecare token cu un rand din tabela ingredients
-- ============================================================
DO $$
DECLARE
    rec          RECORD;
    token        TEXT;
    token_upper  TEXT;
    ing_id       INT;
    pos          INT;
    tokens       TEXT[];
BEGIN
    -- Iteram prin toate produsele care au lista de ingrediente
    FOR rec IN
        SELECT id, ingredients_list
        FROM products
        WHERE ingredients_list IS NOT NULL
          AND TRIM(ingredients_list) <> ''
    LOOP
        -- Parsam lista dupa virgula (delimitatorul standard INCI)
        tokens := string_to_array(rec.ingredients_list, ',');
        pos    := 0;

        FOREACH token IN ARRAY tokens
        LOOP
            -- Curatam tokenul: trim + uppercase (asa sunt stocate in tabela ingredients)
            token_upper := UPPER(TRIM(token));

            -- Sarim tokenii prea scurti (artefacte)
            IF LENGTH(token_upper) < 2 THEN
                CONTINUE;
            END IF;

            -- Cautam ingredientul in tabela ingredients dupa inci_name
            SELECT id INTO ing_id
            FROM ingredients
            WHERE UPPER(inci_name) = token_upper
            LIMIT 1;

            -- Daca l-am gasit, il inserem in tabelul de jonctiune
            IF ing_id IS NOT NULL THEN
                INSERT INTO product_ingredients (product_id, ingredient_id, position)
                VALUES (rec.id, ing_id, pos)
                ON CONFLICT (product_id, ingredient_id) DO NOTHING;
            END IF;

            pos := pos + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Migrare finalizata cu succes.';
END $$;


-- ============================================================
-- PASUL 3: Row Level Security (la fel ca restul tabelelor)
-- ============================================================
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to product_ingredients" ON product_ingredients;
CREATE POLICY "Public read access to product_ingredients"
    ON product_ingredients FOR SELECT
    USING (true);


-- ============================================================
-- PASUL 4: Verificare - afiseaza primele rezultate
-- ============================================================
SELECT
    p.name        AS produs,
    p.barcode,
    i.inci_name   AS ingredient,
    i.score       AS scor_cosing,
    pi.position   AS pozitie_inci
FROM product_ingredients pi
JOIN products    p ON p.id = pi.product_id
JOIN ingredients i ON i.id = pi.ingredient_id
ORDER BY p.name, pi.position
LIMIT 50;

-- Numar total de legaturi create:
SELECT COUNT(*) AS total_legaturi FROM product_ingredients;


-- ============================================================
-- NOTA despre coloana products.ingredients_list
-- ============================================================
-- NU stergem si NU redenumim ingredients_list dupa migrare.
-- Motivul: backend-ul o foloseste activ in 3 locuri:
--   1. toxicityAnalyzer.js  - parsare + analiza la fiecare scanare
--   2. productController.js - afisare lista in frontend (ProductScreen)
--   3. geminiService.js     - trimisa ca context la chatbot-ul AI
--
-- Strategia aleasa este ADITIVA:
--   ingredients_list TEXT  = textul brut original (raw backup, OCR-friendly)
--   product_ingredients    = legaturile normalizate (relational layer)
-- Ambele coexista. Prima serveste backend-ul, a doua serveste integritatea DB.
-- ============================================================
