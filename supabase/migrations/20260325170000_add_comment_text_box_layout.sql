-- Persist loop-comment text box layout (position + size) for top-level comments.
-- Values are stored as percentages relative to video overlay dimensions.

alter table public.session_comments
  add column if not exists text_box_x_percent double precision,
  add column if not exists text_box_y_percent double precision,
  add column if not exists text_box_width_percent double precision,
  add column if not exists text_box_height_percent double precision;

alter table public.shot_video_comments
  add column if not exists text_box_x_percent double precision,
  add column if not exists text_box_y_percent double precision,
  add column if not exists text_box_width_percent double precision,
  add column if not exists text_box_height_percent double precision;
