-- Document Embeddings Table for RAG Agent (pgvector)
-- Created: 2026-01-14

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('case_note', 'report')),
  source_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding extensions.vector(768) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_source_chunk UNIQUE (source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_user_id ON public.document_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_source_type ON public.document_embeddings(source_type);
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_source_id ON public.document_embeddings(source_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'document_embeddings' AND indexname = 'idx_doc_embeddings_vector'
  ) THEN
    EXECUTE 'CREATE INDEX idx_doc_embeddings_vector ON public.document_embeddings USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64)';
  END IF;
END $$;

ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_embeddings' AND policyname='Users can view own embeddings') THEN
    CREATE POLICY "Users can view own embeddings" ON public.document_embeddings FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_embeddings' AND policyname='Users can insert own embeddings') THEN
    CREATE POLICY "Users can insert own embeddings" ON public.document_embeddings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_embeddings' AND policyname='Users can delete own embeddings') THEN
    CREATE POLICY "Users can delete own embeddings" ON public.document_embeddings FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_embeddings' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON public.document_embeddings FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.search_documents(
  query_embedding extensions.vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_type VARCHAR(50),
  source_id UUID,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.source_type,
    de.source_id,
    de.chunk_text,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  WHERE
    (filter_user_id IS NULL OR de.user_id = filter_user_id)
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
