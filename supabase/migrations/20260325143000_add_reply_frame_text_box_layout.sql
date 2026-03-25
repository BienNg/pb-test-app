-- Persist frame-detail text box layout (position + size) for reply overlays.
-- Values are stored as percentages relative to video overlay dimensions.

alter table public.session_comment_replies
  add column if not exists marker_text_box_x_percent double precision,
  add column if not exists marker_text_box_y_percent double precision,
  add column if not exists marker_text_box_width_percent double precision,
  add column if not exists marker_text_box_height_percent double precision;

alter table public.shot_video_comment_replies
  add column if not exists marker_text_box_x_percent double precision,
  add column if not exists marker_text_box_y_percent double precision,
  add column if not exists marker_text_box_width_percent double precision,
  add column if not exists marker_text_box_height_percent double precision;
