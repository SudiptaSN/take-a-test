-- 1. Attempts Table Hardening
drop policy if exists "own attempts" on attempts;

create policy "admin manage attempts" on attempts for all
  using (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "candidate read own attempts" on attempts for select
  using (candidate_id = auth.uid());

create policy "candidate insert own attempts" on attempts for insert
  with check (candidate_id = auth.uid());

-- 2. Answers Table Hardening
drop policy if exists "own answers" on answers;

create policy "admin manage answers" on answers for all
  using (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "candidate read own answers" on answers for select
  using (exists(select 1 from attempts a where a.id = attempt_id and a.candidate_id = auth.uid()));

create policy "candidate insert own answers" on answers for insert
  with check (exists(select 1 from attempts a where a.id = attempt_id and a.candidate_id = auth.uid() and a.status = 'in_progress'));

create policy "candidate update own answers" on answers for update
  using (exists(select 1 from attempts a where a.id = attempt_id and a.candidate_id = auth.uid() and a.status = 'in_progress'));

-- 3. Proctor Events Hardening
drop policy if exists "own events insert" on proctor_events;

create policy "own events insert" on proctor_events for insert
  with check (exists(select 1 from attempts a where a.id = attempt_id and a.candidate_id = auth.uid() and a.status = 'in_progress'));

-- 4. Server-Side Time Limit Enforcement in submit_attempt
create or replace function public.submit_attempt(p_attempt_id uuid, p_terminated boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_test_id uuid;
  v_status attempt_status;
  v_total numeric := 0;
  v_started_at timestamptz;
  v_extra_minutes int;
  v_duration int;
  v_paused_at timestamptz;
  r record;
  s numeric;
  resp jsonb;
  correct jsonb;
  match boolean;
begin
  if v_user_id is null then raise exception 'not signed in'; end if;

  select a.test_id, a.status, a.started_at, coalesce(a.extra_minutes, 0), t.duration_minutes, a.paused_at
    into v_test_id, v_status, v_started_at, v_extra_minutes, v_duration, v_paused_at
  from attempts a
  join tests t on t.id = a.test_id
  where a.id = p_attempt_id and a.candidate_id = v_user_id;
  
  if v_test_id is null then raise exception 'attempt not found'; end if;
  if v_status <> 'in_progress' then raise exception 'attempt not in progress'; end if;
  
  -- Prevent submission while paused
  if v_paused_at is not null then
    raise exception 'cannot submit while paused';
  end if;

  -- Validate time limit: allow 2 minutes grace period for network delays
  if now() > v_started_at + ((v_duration + v_extra_minutes) * interval '1 minute') + interval '2 minutes' then
    insert into proctor_events (attempt_id, kind, detail) 
    values (p_attempt_id, 'late_submission', jsonb_build_object('submitted_at', now(), 'expected_end', v_started_at + ((v_duration + v_extra_minutes) * interval '1 minute')));
  end if;

  for r in
    select a.id as aid, q.id as qid, q.type, q.points, a.response, k.correct,
           coalesce(a.score, 0) as existing_score
    from answers a
    join questions q on q.id = a.question_id
    left join answer_keys k on k.question_id = q.id
    where a.attempt_id = p_attempt_id
  loop
    s := 0;
    if r.type = 'long_text' then
      s := r.existing_score;
    else
      resp := coalesce(r.response->'selected', '[]'::jsonb);
      correct := coalesce(r.correct, '[]'::jsonb);
      if r.type = 'mcq_single'
         and jsonb_array_length(resp) = 1
         and exists (select 1 from jsonb_array_elements_text(correct) c where c = resp->>0) then
        s := r.points;
      elsif r.type = 'mcq_multi'
         and jsonb_array_length(resp) = jsonb_array_length(correct) then
        select bool_and(elem in (select jsonb_array_elements_text(correct)))
          into match from jsonb_array_elements_text(resp) elem;
        if coalesce(match, false) then s := r.points; end if;
      end if;
      update answers set score = s where id = r.aid;
    end if;
    v_total := v_total + s;
  end loop;

  update attempts
    set status = case when p_terminated then 'terminated'::attempt_status else 'submitted'::attempt_status end,
        submitted_at = now(),
        score = v_total
    where id = p_attempt_id;
end; $$;
