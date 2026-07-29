-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE TYPE public.attempt_status AS ENUM (
  'in_progress',
  'submitted',
  'terminated'
);

CREATE TYPE public.question_type AS ENUM (
  'mcq_single',
  'mcq_multi',
  'long_text'
);

CREATE TYPE public.user_role AS ENUM (
  'admin',
  'candidate'
);

CREATE SEQUENCE public.proctor_events_id_seq;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'candidate'::user_role
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end; $function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

CREATE FUNCTION public.submit_attempt (
  p_attempt_id uuid,
  p_terminated boolean DEFAULT false
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_user_id uuid := auth.uid();
  v_test_id uuid;
  v_status attempt_status;
  v_total numeric := 0;
  r record;
  s numeric;
  resp jsonb;
  correct jsonb;
  match boolean;
begin
  if v_user_id is null then raise exception 'not signed in'; end if;

  select test_id, status into v_test_id, v_status
  from attempts where id = p_attempt_id and candidate_id = v_user_id;
  if v_test_id is null then raise exception 'attempt not found'; end if;
  if v_status <> 'in_progress' then raise exception 'attempt not in progress'; end if;

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
end; $function$;

GRANT ALL ON FUNCTION public.submit_attempt(uuid, boolean) TO authenticated;

GRANT ALL ON FUNCTION public.submit_attempt(uuid, boolean) TO service_role;

CREATE TABLE public.answer_keys (
  question_id uuid  NOT NULL,
  correct     jsonb
);

ALTER TABLE public.answer_keys
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.answer_keys
  ADD CONSTRAINT answer_keys_pkey PRIMARY KEY (question_id);

GRANT ALL ON public.answer_keys TO anon;

GRANT ALL ON public.answer_keys TO authenticated;

GRANT ALL ON public.answer_keys TO service_role;

CREATE TABLE public.answers (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  attempt_id  uuid                     NOT NULL,
  question_id uuid                     NOT NULL,
  response    jsonb,
  score       numeric,
  feedback    text,
  updated_at  timestamp with time zone DEFAULT now()
);

ALTER TABLE public.answers
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.answers
  ADD CONSTRAINT answers_attempt_id_question_id_key UNIQUE (attempt_id, question_id);

ALTER TABLE public.answers
  ADD CONSTRAINT answers_pkey PRIMARY KEY (id);

GRANT ALL ON public.answers TO anon;

GRANT ALL ON public.answers TO authenticated;

GRANT ALL ON public.answers TO service_role;

CREATE TABLE public.attempts (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  test_id      uuid                     NOT NULL,
  candidate_id uuid                     NOT NULL,
  status       public.attempt_status    DEFAULT 'in_progress'::public.attempt_status NOT NULL,
  started_at   timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  score        numeric,
  unlocked     boolean                  DEFAULT false NOT NULL
);

ALTER TABLE public.attempts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attempts
  ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);

ALTER TABLE public.answers
  ADD CONSTRAINT answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;

ALTER TABLE public.attempts
  ADD CONSTRAINT attempts_test_id_candidate_id_key UNIQUE (test_id, candidate_id);

GRANT ALL ON public.attempts TO anon;

GRANT ALL ON public.attempts TO authenticated;

GRANT ALL ON public.attempts TO service_role;

CREATE TABLE public.invites (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  test_id    uuid                     NOT NULL,
  email      text                     NOT NULL,
  code       text                     NOT NULL,
  used_at    timestamp with time zone,
  used_by    uuid,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.invites
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invites
  ADD CONSTRAINT invites_code_key UNIQUE (code);

ALTER TABLE public.invites
  ADD CONSTRAINT invites_pkey PRIMARY KEY (id);

ALTER TABLE public.invites
  ADD CONSTRAINT invites_test_id_email_key UNIQUE (test_id, email);

GRANT ALL ON public.invites TO anon;

GRANT ALL ON public.invites TO authenticated;

GRANT ALL ON public.invites TO service_role;

CREATE POLICY "candidate read own invite" ON public.invites
  FOR SELECT
  TO authenticated
  USING ((lower(email) = lower((( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text)));

CREATE TABLE public.proctor_events (
  id         bigint                   DEFAULT nextval('public.proctor_events_id_seq'::regclass) NOT NULL,
  attempt_id uuid                     NOT NULL,
  kind       text                     NOT NULL,
  detail     jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER SEQUENCE public.proctor_events_id_seq OWNED BY public.proctor_events.id;

GRANT ALL ON SEQUENCE public.proctor_events_id_seq TO anon;

GRANT ALL ON SEQUENCE public.proctor_events_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.proctor_events_id_seq TO service_role;

ALTER TABLE public.proctor_events
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proctor_events
  ADD CONSTRAINT proctor_events_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;

ALTER TABLE public.proctor_events
  ADD CONSTRAINT proctor_events_pkey PRIMARY KEY (id);

GRANT ALL ON public.proctor_events TO anon;

GRANT ALL ON public.proctor_events TO authenticated;

GRANT ALL ON public.proctor_events TO service_role;

CREATE POLICY "own events insert" ON public.proctor_events
  FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.attempts a
  WHERE ((a.id = proctor_events.attempt_id) AND (a.candidate_id = auth.uid())))));

CREATE TABLE public.profiles (
  id         uuid                     NOT NULL,
  email      text                     NOT NULL,
  full_name  text,
  role       public.user_role         DEFAULT 'candidate'::public.user_role NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE POLICY "admin manage answer_keys" ON public.answer_keys
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE POLICY "own answers" ON public.answers
  USING ((EXISTS ( SELECT 1
   FROM public.attempts a
  WHERE ((a.id = answers.attempt_id) AND ((a.candidate_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.attempts a
  WHERE ((a.id = answers.attempt_id) AND (a.candidate_id = auth.uid())))));

CREATE POLICY "own attempts" ON public.attempts
  USING (((candidate_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role))))))
  WITH CHECK (((candidate_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role))))));

CREATE POLICY "admin manage invites" ON public.invites
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE POLICY "events read" ON public.proctor_events
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.attempts a
  WHERE ((a.id = proctor_events.attempt_id) AND ((a.candidate_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))))))));

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.attempts
  ADD CONSTRAINT attempts_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.invites
  ADD CONSTRAINT invites_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

GRANT ALL ON public.profiles TO anon;

GRANT ALL ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "self read profile" ON public.profiles
  FOR SELECT
  USING ((auth.uid() = id));

CREATE POLICY "self update profile" ON public.profiles
  FOR UPDATE
  USING ((auth.uid() = id));

CREATE TABLE public.questions (
  id         uuid                 DEFAULT gen_random_uuid() NOT NULL,
  test_id    uuid                 NOT NULL,
  "position" integer              DEFAULT 0 NOT NULL,
  type       public.question_type NOT NULL,
  prompt     text                 NOT NULL,
  options    jsonb,
  points     integer              DEFAULT 1 NOT NULL,
  image_url  text
);

ALTER TABLE public.questions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_pkey PRIMARY KEY (id);

ALTER TABLE public.answer_keys
  ADD CONSTRAINT answer_keys_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE public.answers
  ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

GRANT ALL ON public.questions TO anon;

GRANT ALL ON public.questions TO authenticated;

GRANT ALL ON public.questions TO service_role;

CREATE POLICY "admin manage questions" ON public.questions
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE TABLE public.tests (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  owner_id         uuid                     NOT NULL,
  title            text                     NOT NULL,
  description      text,
  duration_minutes integer                  DEFAULT 30 NOT NULL,
  is_published     boolean                  DEFAULT false,
  require_seb      boolean                  DEFAULT false NOT NULL,
  invite_only      boolean                  DEFAULT false NOT NULL,
  access_code      text,
  created_at       timestamp with time zone DEFAULT now()
);

CREATE POLICY "questions readable with test" ON public.questions
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.tests t
  WHERE ((t.id = questions.test_id) AND (t.is_published OR (t.owner_id = auth.uid()))))));

ALTER TABLE public.tests
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_pkey PRIMARY KEY (id);

ALTER TABLE public.attempts
  ADD CONSTRAINT attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;

ALTER TABLE public.invites
  ADD CONSTRAINT invites_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;

GRANT ALL ON public.tests TO anon;

GRANT ALL ON public.tests TO authenticated;

GRANT ALL ON public.tests TO service_role;

CREATE POLICY "admin manage tests" ON public.tests
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE POLICY "published tests readable" ON public.tests
  FOR SELECT
  USING (((is_published = true) OR (owner_id = auth.uid())));

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
