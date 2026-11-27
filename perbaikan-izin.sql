-- =====================================================
-- PERBAIKAN IZIN TABEL ("permission denied for table ...")
-- Jalankan sekali di: Supabase > SQL Editor > New query > Run
-- Aman dijalankan berulang kali. Keamanan data tetap dijaga oleh RLS.
-- =====================================================

grant usage on schema public to anon, authenticated;

-- Profil: baca (dibatasi RLS), ubah nama & foto saja
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- Pertemanan
grant select, insert, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

-- Pesan
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

-- Blokir & laporan
grant select, insert, delete on public.blocks to authenticated;
grant insert on public.reports to authenticated;

-- Fungsi yang dipanggil aplikasi
grant execute on function public.find_profile(text) to authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.ensure_profile() to authenticated;

-- Pastikan tabel ikut realtime (abaikan error "already member" bila muncul)
do $$
begin
  begin alter publication supabase_realtime add table public.messages; exception when others then null; end;
  begin alter publication supabase_realtime add table public.friendships; exception when others then null; end;
end $$;
