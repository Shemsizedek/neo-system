-- NIBIRU-027 draft migration: apply only after security review.
CREATE TABLE IF NOT EXISTS private_deal_opportunity_audit (
 id bigserial PRIMARY KEY,
 opportunity_id text NOT NULL REFERENCES private_deal_opportunities(id),
 actor_subject text NOT NULL,
 action text NOT NULL,
 stage text,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private_deal_opportunity_audit FROM PUBLIC;
-- Production must grant INSERT and no UPDATE/DELETE to the runtime role.
