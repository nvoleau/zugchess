-- Catalogue procédural : flag positions générées + textes par défaut sur les thèmes
ALTER TABLE "Position" ADD COLUMN "generated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Theme" ADD COLUMN "defaultTexts" JSONB;
