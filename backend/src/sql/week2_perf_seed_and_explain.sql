-- Mock data + EXPLAIN ANALYZE helpers (Week 2 Dev5)
-- Run in Supabase SQL Editor (or via MCP execute_sql).

-- 1) Seed tags, posts, post_tags, comments
insert into public.tags(name, slug)
select 'tag-'||gs, 'tag-'||gs
from generate_series(1,30) gs
on conflict (name) do nothing;

with me as (select id from public.profiles limit 1),
cat as (select id from public.categories order by id limit 1)
insert into public.posts(title, body, author_id, category_id)
select
  'Mock Post '||gs,
  'Bu bir mock post içeriğidir #'||gs,
  (select id from me),
  (select id from cat)
from generate_series(1,50) gs;

insert into public.post_tags(post_id, tag_id)
select p.id, t.id
from public.posts p
join lateral (
  select id from public.tags order by random() limit 3
) t on true
on conflict do nothing;

with me as (select id from public.profiles limit 1),
posts as (select id from public.posts order by created_at desc limit 20),
roots as (
  insert into public.comments(body, author_id, post_id, parent_id)
  select
    'Root comment '||gs,
    (select id from me),
    (select id from posts order by random() limit 1),
    null
  from generate_series(1,200) gs
  returning id, post_id
)
insert into public.comments(body, author_id, post_id, parent_id)
select
  'Reply comment '||gs,
  (select id from me),
  r.post_id,
  r.id
from roots r
join generate_series(1,2) gs on true;

-- 2) EXPLAIN ANALYZE examples
explain analyze
select p.id, p.title, p.created_at
from public.posts p
order by p.created_at desc, p.id desc
limit 10 offset 20;

explain analyze
select * from public.get_post_comments_tree(
  (select id from public.posts order by created_at desc limit 1)
);

