-- Loosen the webhook URL check in slack_connect.
--
-- WHY: the original check demanded the path be exactly /services/ followed only
-- by [A-Za-z0-9/_-]. That rejected a genuine Incoming Webhook copied straight
-- out of Slack, with an error that (correctly) said the URL looked wrong — so
-- the only signal pointed at the URL rather than at this check.
--
-- The security property worth keeping is that the server can only ever be made
-- to POST at hooks.slack.com. The host lock alone gives that; pinning the path
-- shape and character set adds nothing and is what broke. Slack itself is the
-- better judge of whether a webhook is valid, and the test message that fires
-- on connect reports its verdict immediately.
--
-- Also trims the value before storing, so a stray space or newline picked up
-- while copying can't fail the check or, worse, be saved into the URL.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

create or replace function public.slack_connect(p_org_id uuid, p_webhook_url text, p_channel_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_url text := trim(coalesce(p_webhook_url, ''));
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Only an owner or admin can connect an integration';
  end if;

  if not public.org_has_integrations(p_org_id) then
    raise exception 'Integrations are available on the Pro and Business plans';
  end if;

  -- Host lock: this value is fetched and POSTed to by a service-role function,
  -- so it must never be able to point anywhere but Slack.
  if v_url !~ '^https://hooks\.slack\.com/' then
    raise exception 'That webhook URL should start with https://hooks.slack.com/ — copy it from Slack under Incoming Webhooks.';
  end if;

  insert into public.org_integrations (org_id, provider, webhook_url, channel_label, connected_by, connected_at, updated_at)
  values (p_org_id, 'slack', v_url, nullif(trim(coalesce(p_channel_label, '')), ''), auth.uid(), now(), now())
  on conflict (org_id, provider) do update
    set webhook_url   = excluded.webhook_url,
        channel_label = excluded.channel_label,
        enabled       = true,
        connected_by  = excluded.connected_by,
        connected_at  = now(),
        updated_at    = now();
end;
$function$;

revoke all on function public.slack_connect(uuid, text, text) from public;
grant execute on function public.slack_connect(uuid, text, text) to authenticated;
