create table product_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references user_profiles(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  issue_category text not null,
  user_comment text,
  created_at timestamptz default now()
);


alter table product_reports enable row level security;


create policy "Users can insert their own reports"
on product_reports for insert
to authenticated
with check (auth.uid() = user_id);
