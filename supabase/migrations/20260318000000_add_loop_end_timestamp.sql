-- Add loop end timestamp to comments (for video loop range: start = timestamp_seconds, end = loop_end_timestamp_seconds)
alter table public.session_comments
  add column if not exists loop_end_timestamp_seconds double precision;

alter table public.shot_video_comments
  add column if not exists loop_end_timestamp_seconds double precision;
