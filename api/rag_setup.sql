-- 1. Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- 2. Create the Knowledge Base table (Metadata for uploaded files)
create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  file_name text not null,
  file_type text not null,
  content text,
  upload_date timestamptz default now()
);

-- 3. Create the Knowledge Chunks table (Vector storage for RAG)
create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references knowledge_base(id) on delete cascade,
  user_id text not null,
  content text not null,
  embedding vector(1536)
);

-- 4. Index for fast vector similarity search
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 5. Drop & recreate the RPC function (to allow type changes)
drop function if exists match_knowledge_chunks(vector, double precision, integer, text);
drop function if exists match_knowledge_chunks(vector, double precision, integer, text, uuid[]);

create or replace function match_knowledge_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id text,
  p_file_ids uuid[] default null
)
returns table (
  id uuid,
  file_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    knowledge_chunks.id,
    knowledge_chunks.file_id,
    knowledge_chunks.content,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where knowledge_chunks.user_id = p_user_id
    and (p_file_ids is null or knowledge_chunks.file_id = any(p_file_ids))
    and 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  order by (knowledge_chunks.embedding <=> query_embedding) asc
  limit match_count;
end;
$$;

-- ───────────────────────────────────────────
-- 6. Chat History Tables (PostgreSQL persistence)
-- ───────────────────────────────────────────

-- Chats table: one row per conversation session
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,          -- stores user email
  title text not null default 'New Chat',
  last_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages table: all messages within a chat
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  user_id text not null,
  content text not null,
  is_bot boolean not null default false,
  timestamp text,
  sources jsonb,                  -- stores RAG source attribution as JSON
  created_at timestamptz default now()
);

-- Indexes for fast lookups
create index if not exists chats_user_id_idx on chats(user_id);
create index if not exists messages_chat_id_idx on messages(chat_id);



