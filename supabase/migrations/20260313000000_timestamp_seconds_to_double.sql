-- Store frame-accurate video timestamps (fractional seconds) for comments and replies.
alter table public.session_comments
  alter column timestamp_seconds type double precision using timestamp_seconds::double precision;

alter table public.session_comment_replies
  alter column timestamp_seconds type double precision using timestamp_seconds::double precision;
