-- RAG Agent Conversations Table
-- Stores chat history for the RAG Agent v1 feature (Super Admin only)

CREATE TABLE IF NOT EXISTS rag_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_rag_conversations_session
  ON rag_agent_conversations(session_id, created_at);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_rag_conversations_user
  ON rag_agent_conversations(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE rag_agent_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own conversations
CREATE POLICY "Users can manage own RAG conversations"
  ON rag_agent_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RAG Agent Sessions Table (for tracking conversation sessions)
CREATE TABLE IF NOT EXISTS rag_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user sessions
CREATE INDEX IF NOT EXISTS idx_rag_sessions_user
  ON rag_agent_sessions(user_id, updated_at DESC);

-- Row Level Security
ALTER TABLE rag_agent_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own sessions
CREATE POLICY "Users can manage own RAG sessions"
  ON rag_agent_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update session timestamp
CREATE OR REPLACE FUNCTION update_rag_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rag_agent_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session timestamp on new message
CREATE TRIGGER trigger_update_session_timestamp
  AFTER INSERT ON rag_agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_session_timestamp();
