// =============================================================
// BM Forum - Gerçekçi test verisi (seed)
// Çalıştırmak için: npm run seed
// Frontend'in boş ekranla değil gerçekçi içerikle geliştirmesi için birkaç
// kullanıcı + Türkçe gönderi + etiket + yorum + oy + bir "çözülmüş" örnek üretir.
//
// Idempotent: seed kullanıcıları zaten varsa tekrar oluşturmaz.
// NOT: Sadece geliştirme/test ortamında kullanın (service_role gerekir).
// =============================================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('[seed] SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(1);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const USERS = [
  { email: 'seed_ayse@bmforum.com', username: 'ayse_yilmaz' },
  { email: 'seed_mehmet@bmforum.com', username: 'mehmet_demir' },
  { email: 'seed_zeynep@bmforum.com', username: 'zeynep_kaya' },
  { email: 'seed_can@bmforum.com', username: 'can_ozturk' }
];
const PASSWORD = 'SeedTest123';

const POSTS = [
  {
    title: 'Veri Yapıları dersi için hangi kaynakları önerirsiniz?',
    body: 'İkinci sınıf Veri Yapıları dersine hazırlanıyorum. Ağaçlar ve graflar konusunda zorlanıyorum. Türkçe veya İngilizce kaynak önerisi olan var mı? Özellikle bol örnekli olanları tercih ederim.',
    tags: ['veri-yapilari', 'ders', 'kaynak'],
    votes: 12
  },
  {
    title: 'Bitirme projesi için konu önerisi arıyorum',
    body: 'Makine öğrenmesi alanında bir bitirme projesi yapmak istiyorum ama konu bulmakta zorlanıyorum. Öğrenci işleri veya kampüs hayatıyla ilgili veri seti bulabileceğim bir fikir var mı?',
    tags: ['bitirme-projesi', 'makine-ogrenmesi'],
    votes: 8
  },
  {
    title: 'Staj başvurularında CV nasıl olmalı?',
    body: 'Yaz stajı için başvurulara başladım. Henüz iş deneyimim yok, CV\'de neleri öne çıkarmalıyım? GitHub profili ve okul projeleri yeterli olur mu?',
    tags: ['staj', 'kariyer', 'cv'],
    votes: 25
  },
  {
    title: 'Kampüste hangi kulüplere katılmak mantıklı?',
    body: 'Birinci sınıfım, sosyalleşmek ve bir şeyler öğrenmek istiyorum. Yazılım/robotik kulüpleri aktif mi? Deneyimi olan arkadaşlar tavsiye verebilir mi?',
    tags: ['kampus', 'kulup'],
    votes: 5
  },
  {
    title: 'Vize haftası için çalışma programı önerisi',
    body: 'Aynı hafta 4 vizem var ve nasıl bir program yapacağımı bilemiyorum. Pomodoro tekniği işe yarıyor mu? Sizin denenmiş yöntemleriniz neler?',
    tags: ['vize', 'calisma-teknikleri'],
    votes: 17
  }
];

async function findUserByEmail(email) {
  // admin.listUsers sayfalı; küçük seed için ilk sayfa yeterli
  const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  return (data?.users || []).find((u) => u.email === email) || null;
}

async function ensureUser(u) {
  const existing = await findUserByEmail(u.email);
  if (existing) return existing.id;
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: u.username }
  });
  if (error) throw new Error(`kullanıcı oluşturulamadı (${u.email}): ${error.message}`);
  return data.user.id;
}

async function main() {
  console.log('[seed] Başlıyor...');

  // 1) Kullanıcılar (trigger profiles'ı otomatik açar)
  const ids = [];
  for (const u of USERS) {
    const id = await ensureUser(u);
    ids.push(id);
    console.log(`[seed] kullanıcı hazır: ${u.username}`);
  }

  // Zaten seed'lenmiş mi? (ilk kullanıcının postu varsa atla)
  const { count: existingCount } = await sb
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', ids[0]);
  if (existingCount && existingCount > 0) {
    console.log('[seed] Zaten seed verisi var, çıkılıyor (idempotent).');
    return;
  }

  // 2) Kategori (Genel = ilk sıradaki)
  const { data: cat } = await sb.from('categories').select('id').order('id').limit(1).single();
  const categoryId = cat?.id || 1;

  // 3) Gönderiler + etiketler
  const postIds = [];
  for (let i = 0; i < POSTS.length; i++) {
    const p = POSTS[i];
    const authorId = ids[i % ids.length];
    const { data: postRow, error: pErr } = await sb
      .from('posts')
      .insert([{
        title: p.title,
        body: p.body,
        author_id: authorId,
        category_id: categoryId,
        upvote_count: p.votes,
        view_count: p.votes * 7
      }])
      .select('id')
      .single();
    if (pErr) throw new Error(`post eklenemedi: ${pErr.message}`);
    postIds.push(postRow.id);

    for (const tagName of p.tags) {
      const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const { data: tag } = await sb.from('tags').upsert([{ name: tagName, slug }], { onConflict: 'name' }).select('id').single();
      if (tag) await sb.from('post_tags').upsert([{ post_id: postRow.id, tag_id: tag.id }], { onConflict: 'post_id,tag_id' });
    }
  }
  console.log(`[seed] ${postIds.length} gönderi eklendi.`);

  // 4) Yorumlar (farklı kullanıcılardan → bildirim trigger'ı da tetiklenir)
  const COMMENTS = [
    'Bence CLRS klasik ama başlangıç için ağır olabilir, önce Türkçe bir kaynakla temeli kurmanı öneririm.',
    'Ben de aynı dertteydim, YouTube\'da bol görselli anlatımlar çok işime yaradı.',
    'GitHub profilin ve 2-3 düzgün proje fazlasıyla yeterli, staj için deneyim şart değil.',
    'Robotik kulübü bu dönem çok aktif, kesinlikle dene!',
    'Pomodoro işe yarıyor ama 25 dk sana kısa geliyorsa 50/10 dene.'
  ];
  let cCount = 0;
  for (let i = 0; i < postIds.length; i++) {
    const commenter = ids[(i + 1) % ids.length]; // gönderi sahibinden farklı
    const { error: cErr } = await sb.from('comments').insert([{
      body: COMMENTS[i % COMMENTS.length],
      author_id: commenter,
      post_id: postIds[i]
    }]);
    if (!cErr) cCount++;
  }
  console.log(`[seed] ${cCount} yorum eklendi.`);

  // 5) Bir gönderiyi "çözülmüş" işaretle (kabul edilen cevap örneği)
  const { data: firstComment } = await sb
    .from('comments')
    .select('id, post_id')
    .eq('post_id', postIds[0])
    .limit(1)
    .maybeSingle();
  if (firstComment) {
    await sb.from('posts').update({ accepted_comment_id: firstComment.id }).eq('id', postIds[0]);
    console.log('[seed] 1 gönderi "çözülmüş" olarak işaretlendi.');
  }

  console.log('[seed] ✅ Tamamlandı. Giriş bilgileri: seed_ayse@bmforum.com / ' + PASSWORD);
}

main().catch((e) => { console.error('[seed] ❌ Hata:', e.message); process.exit(1); });
