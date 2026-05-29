-- ─────────────────────────────────────────────────────────────────────────
-- Tabela: cestas_indices
-- Permite que cada usuário monte combinações ponderadas de índices oficiais
-- (ex: IPCA 40% + INCC 40% + Salário Mínimo 20%)
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists cestas_indices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null,
  descricao text,
  -- composicao: array de objetos [{indice: 'IPCA', peso: 0.40}, ...]
  -- os pesos devem somar 1 (validado no app)
  composicao jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Índice para buscas por usuário
create index if not exists idx_cestas_user on cestas_indices(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security: cada usuário acessa apenas as suas cestas
-- ─────────────────────────────────────────────────────────────────────────

alter table cestas_indices enable row level security;

drop policy if exists "users manage own baskets" on cestas_indices;
create policy "users manage own baskets"
  on cestas_indices
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: atualiza updated_at automaticamente
-- ─────────────────────────────────────────────────────────────────────────

create or replace function update_cestas_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cestas_updated_at on cestas_indices;
create trigger trg_cestas_updated_at
  before update on cestas_indices
  for each row execute function update_cestas_updated_at();
