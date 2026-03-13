-- Frame detail marker position and size for session comment replies (ellipse on video).
-- All nullable; when set, the reply's marker is shown at this position/size when viewing the reply.
alter table public.session_comment_replies
  add column if not exists marker_x_percent double precision,
  add column if not exists marker_y_percent double precision,
  add column if not exists marker_radius_x integer,
  add column if not exists marker_radius_y integer;
