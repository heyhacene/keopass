-- ========================================================
-- SCHÉMA DU COFFRE-FORT ZERO-KNOWLEDGE PASSVAULT
-- ========================================================

CREATE TABLE IF NOT EXISTS public.vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('login', 'card', 'note', 'identity')),
  encrypted_payload TEXT NOT NULL, -- Blob Base64 chiffré en AES-256-GCM
  favorite BOOLEAN DEFAULT FALSE,
  folder TEXT DEFAULT 'personal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Index pour accélérer les requêtes de synchronisation par utilisateur
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON public.vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_updated_at ON public.vault_items(updated_at);

-- Activer Row Level Security (RLS) : chaque utilisateur n'accède QU'À ses propres éléments
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vault items"
  ON public.vault_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vault items"
  ON public.vault_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vault items"
  ON public.vault_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vault items"
  ON public.vault_items FOR DELETE
  USING (auth.uid() = user_id);

-- Activer la réplication Realtime pour la synchronisation instantanée entre appareils
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_items;
