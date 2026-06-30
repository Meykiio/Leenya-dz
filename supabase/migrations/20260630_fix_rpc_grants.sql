-- Re-grant EXECUTE on RPCs wiped by DROP+CREATE in 20260630_fix_skip_queue_bounded_swap
GRANT EXECUTE ON FUNCTION public.get_queue_ticket(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_queue(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_queue(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_queue_ticket(UUID) TO authenticated;

-- Fix over-broad anon feedback grant: INSERT only, no DELETE
REVOKE ALL ON TABLE public.feedback FROM anon;
GRANT INSERT ON TABLE public.feedback TO anon;
