-- White didn't hold up as a chart colour — a solid white line/bar on the app's warm-dark surfaces
-- reads closer to ink/background than to an identifying colour, and none of the twelve are meant
-- to blend in. Renamed in place (not dropped and re-added) so any member already on this colour,
-- and the enum's ordinal position used by private.next_available_color's `order by c`, carry over
-- unchanged.
alter type public.player_color rename value 'white' to 'lime';
