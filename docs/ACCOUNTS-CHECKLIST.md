# ReuseUp accounts and redesign

## Implemented
- Responsive desktop sidebar / mobile bottom navigation; local SVG illustrations instead of decorative emoji.
- Separate login and registration, password confirmation, reveal button, Spanish error messages and email resend cooldown.
- Complete password-recovery form using Supabase updateUser after the recovery session.
- Pinned browser SDK 2.102.0 at its actual dist/umd/supabase.js distribution path.
- Deferred auth callbacks to avoid performing Supabase calls under the auth event lock.
- Guest storage separated from account snapshots. Cloud progress includes nickname, avatar, points, completed missions, EcoQuiz and dated history.
- Serialized writes with optimistic revision checks, pending-change cache, retry and explicit conflict resolution.
- Personal period scores only. The public competitive leaderboard is NOT enabled; client-supplied scores are not tamper-proof.

## Verified during implementation
A real SQL transaction tested own-row reads, denial of another user's updates and stale-revision rejection with two temporary fixtures, then rolled back all test data. RLS remains enabled. No real user's password or confirmation state was modified.
22 offline browser/contract checks passed with simulated Supabase responses. Those checks do not establish real email delivery or a production login. The checked-in GitHub Actions suite loads the actual repository script.js with a mocked Supabase SDK; inspect the run result before merging.

## Remaining deployment checks
1. Supabase Auth URL Configuration must use the intended public Vercel/custom-domain Site URL, and explicitly allow the chosen application's confirmation/recovery return URLs. The frontend requests `/?auth=confirm` and `/?auth=recovery` on its current origin. Do not add unrestricted wildcards for unrelated domains.
2. Confirm an actual account from the most recent email and test signing in, changing nickname, reloading, signing out, and signing in on a second device.
3. Test a real reset-password email through completion. The UI flow is implemented; production delivery is not proven by mocked tests.
4. Configure an appropriate SMTP/email provider before a public launch. The built-in service may impose recipient and sending limits. The 60-second UI cooldown does not override Supabase rate limits.
5. Consider Supabase's leaked-password protection setting; the security advisor reported it disabled.

Auth audit found an unconfirmed account, an invalid/expired confirmation link and email rate-limit errors. Do not repeatedly register the same account. Do not manually mark the email as verified or disable confirmation as a workaround.

## Schema
The remote migration `reuseup_progress_sync_v2` adds `ecoquiz`, `historial` and `revision`. Base policies remain owner-scoped. Anonymous access to user_progress was revoked. The SQL below is a reference snapshot, not a new automatic migration.

```sql
alter table public.user_progress add column if not exists ecoquiz jsonb not null default '{}'::jsonb;
alter table public.user_progress add column if not exists historial jsonb not null default '[]'::jsonb;
alter table public.user_progress add column if not exists revision bigint not null default 0;
-- Applied constraints: jsonb_typeof(ecoquiz) = 'object',
-- jsonb_typeof(historial) = 'array', revision >= 0.
revoke all on public.user_progress from anon;
grant select, insert, update on public.user_progress to authenticated;
```

Never commit a service_role key, database password or email-provider credential. supabase-config.js contains only a public publishable key.
