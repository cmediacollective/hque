-- Multi-company fix: let the owner-protection guard allow company-switching.
--
-- prevent_owner_role_changes() (trigger enforce_owner_role on profiles) blocks
-- an owner from being demoted. But switching the ACTIVE company now changes
-- profiles.role to match whichever company you're viewing — and switching into
-- a company where you're a member looked like a demotion, so the guard refused
-- with "Cannot demote the owner."
--
-- FIX: only treat it as a demotion when the org ISN'T changing (a real in-org
-- demotion) or when the user is leaving entirely (org_id -> null, which would
-- orphan the org). Moving the active view to a DIFFERENT org is not a demotion:
-- the user still owns their own org — that ownership lives in org_members now.
--
-- Everything else about the guard is byte-for-byte unchanged.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

CREATE OR REPLACE FUNCTION public.prevent_owner_role_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
  BEGIN
    -- Promotion to 'owner' is allowed ONLY when the organization has no owner yet
    -- (the creator becoming the first owner of a brand-new org). Attempting to take
    -- ownership of an org that already has an owner is still blocked.
    IF NEW.role = 'owner' AND (OLD.role IS NULL OR OLD.role <> 'owner') THEN
      IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE org_id = NEW.org_id
          AND role = 'owner'
          AND id <> NEW.id
      ) THEN
        RAISE EXCEPTION 'Cannot promote user to owner. There can only be one owner per organization.';
      END IF;
    END IF;

    -- Block demoting an existing owner — but ONLY when staying in the same org (a
    -- real demotion) or leaving entirely (org_id -> null, which would orphan the
    -- org). Switching the ACTIVE company to a DIFFERENT org is not a demotion.
    IF OLD.role = 'owner' AND NEW.role <> 'owner'
       AND (NEW.org_id IS NULL OR NEW.org_id = OLD.org_id) THEN
      RAISE EXCEPTION 'Cannot demote the owner. Ownership transfer must be done manually.';
    END IF;

    RETURN NEW;
  END;
  $function$;
