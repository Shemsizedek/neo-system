-- Free World Knowledge Forum: proposed isolated schema.
-- Review before applying. Does not enable posts on the public site.
BEGIN;
CREATE SCHEMA IF NOT EXISTS fwkf_forum;
CREATE TABLE IF NOT EXISTS fwkf_forum.communities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,50}$'),
 name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 100),
 description text NOT NULL DEFAULT '',
 visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fwkf_forum.members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_subject text NOT NULL UNIQUE CHECK (length(auth_subject) BETWEEN 8 AND 255),
 display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
 role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','deleted')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fwkf_forum.posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 community_id uuid NOT NULL REFERENCES fwkf_forum.communities(id),
 author_id uuid NOT NULL REFERENCES fwkf_forum.members(id),
 title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 180),
 body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 20000),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','hidden','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fwkf_posts_community_status_created ON fwkf_forum.posts (community_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS fwkf_forum.replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 post_id uuid NOT NULL REFERENCES fwkf_forum.posts(id),
 parent_reply_id uuid REFERENCES fwkf_forum.replies(id),
 author_id uuid NOT NULL REFERENCES fwkf_forum.members(id),
 body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','hidden','deleted')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fwkf_replies_post_status ON fwkf_forum.replies(post_id,status,created_at);
CREATE TABLE IF NOT EXISTS fwkf_forum.votes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES fwkf_forum.members(id),
 post_id uuid REFERENCES fwkf_forum.posts(id),
 reply_id uuid REFERENCES fwkf_forum.replies(id),
 value smallint NOT NULL CHECK (value IN (-1,1)),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT one_vote_target CHECK ((post_id IS NOT NULL) <> (reply_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS fwkf_votes_post_once ON fwkf_forum.votes(member_id,post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS fwkf_votes_reply_once ON fwkf_forum.votes(member_id,reply_id) WHERE reply_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS fwkf_forum.reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_id uuid NOT NULL REFERENCES fwkf_forum.members(id),
 post_id uuid REFERENCES fwkf_forum.posts(id),
 reply_id uuid REFERENCES fwkf_forum.replies(id),
 reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1000),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
 reviewed_by uuid REFERENCES fwkf_forum.members(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT one_report_target CHECK ((post_id IS NOT NULL) <> (reply_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS fwkf_forum.moderation_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL REFERENCES fwkf_forum.members(id),
 report_id uuid REFERENCES fwkf_forum.reports(id),
 post_id uuid REFERENCES fwkf_forum.posts(id),
 reply_id uuid REFERENCES fwkf_forum.replies(id),
 action text NOT NULL CHECK(action IN ('approve','hide','restore','lock','warn','suspend')),
 reason text NOT NULL CHECK(length(reason) BETWEEN 4 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON SCHEMA fwkf_forum FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA fwkf_forum FROM PUBLIC;
COMMIT;
