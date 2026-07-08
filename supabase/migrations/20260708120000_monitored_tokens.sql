-- Tokens eligible for Telegram signal notifications (curated Kickstart list).
create table if not exists public.monitored_tokens (
  token_ca     text primary key,
  token_symbol text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.monitored_tokens enable row level security;

-- Seed curated tracked tokens (matches src/terminal/kickstart.ts TRACKED_CAS).
insert into public.monitored_tokens (token_ca, token_symbol, is_active) values
  ('FKshTXX4wUcirV9b4LhLrNP4cxAsA2VBAFdMEw5EASY', 'EASY', true),
  ('bS532krUcXBMNqXURPtGqYA7dhEsenYe2z9QKkcEASY', 'CPX', true),
  ('12z7AWnW5Q8mAS9qFtCWnnMdhNvqScZHe8w627EfEASY', 'VSK', true),
  ('iu3A7azWTm3zQSk81SUC1JctB4zPYnxLmcmqq71EASY', 'BITAGENTS', true),
  ('6gnvghh8LKoM59p1WZSuTgYmdJrnZnhU7BzCcEaEASY', 'SWCH', true),
  ('EhkrQGCnGfVSJc118G1r1S9pxdFdPWJuSyz1iYKEASY', 'SCOUT', true),
  ('5d9VvLtAZQWtyL9EZ3cHWpgdfyeWetwYuiG6746EASY', null, true),
  ('9ufM9TJd1UEmi9awnGfxCkCHAgQ3JZ5Sw6YxeSeEASY', 'INFERRA', true),
  ('VtZmMdFowJcaXAqaW951RVuH84WeLTQxfs83XZWEASY', 'EZSCREENER', true),
  ('y4JiNFzBPofqiCpuDTcVq11nhUDQoDzeK1UBCoXxF9y', 'CVT', true),
  ('9iR8Urs95yLeiajX3T6eYK9t4YBcLbrWS8pCKgoPFb7n', 'PRX', true),
  ('AKKAPZBnJnzfE83DspsBSoqGSMwa2haFvoEJj1qzdrmk', 'HIIE', true),
  ('4kWysUHVqtFmxrvwPUxA66exm2iJBMkvD4EBRrNmcieL', null, true),
  ('HtiQmiV4BFkujshs4kro3Ga3pF8ZcfFqMQNnzfdZdgkb', null, true),
  ('CFRX4w9w2mvhwZAxCPnyTY3PhHTJ9vQgninuXZfH5Wwn', null, true),
  ('DcTVUogWykX1JeBmTq48Fzj2Lc3Y7zwHQS1CyZ9SHnXf', null, true),
  ('HA4WtRuNrjtrzAWTTjCyTZn94Jq9ggV6iraW7SndSLyz', null, true)
on conflict (token_ca) do nothing;