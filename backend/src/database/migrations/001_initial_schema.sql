create table if not exists clients (
  id text primary key,
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null check (role in ('admin', 'client')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_users (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'uploader', 'manager')),
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create table if not exists files (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  uploaded_by text references users(id) on delete set null,
  original_name text not null,
  stored_name text not null,
  mime_type text not null,
  folder text not null check (folder in ('images', 'videos', 'pdfs', 'docs')),
  object_key text not null unique,
  bucket text,
  public_url text,
  size_bytes bigint,
  etag text,
  status text not null default 'pending' check (status in ('pending', 'uploaded', 'failed', 'deleted')),
  visibility text not null default 'private' check (visibility in ('private', 'public', 'signed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  uploaded_at timestamptz,
  deleted_at timestamptz
);

create index if not exists files_client_folder_idx on files(client_id, folder, created_at desc);
create index if not exists files_client_status_idx on files(client_id, status);
create index if not exists files_object_key_idx on files(object_key);

create table if not exists audit_logs (
  id text primary key,
  actor_user_id text references users(id) on delete set null,
  client_id text references clients(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_client_created_idx on audit_logs(client_id, created_at desc);
create index if not exists audit_logs_actor_created_idx on audit_logs(actor_user_id, created_at desc);

