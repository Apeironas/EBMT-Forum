const { z } = require('zod');

const uuidStr = z.string().uuid('Geçerli bir UUID girin.');

exports.registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
  username: z
    .string()
    .min(2, 'Kullanıcı adı en az 2 karakter olmalıdır.')
    .max(50, 'Kullanıcı adı en fazla 50 karakter olabilir.')
});

exports.loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre zorunludur.')
});

exports.refreshSchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token zorunludur.')
});

exports.createPostSchema = z.object({
  title: z.string().min(1, 'Başlık zorunludur.').max(300, 'Başlık çok uzun.'),
  content: z.string().min(1, 'İçerik zorunludur.'),
  categoryId: z.coerce.number().int().positive('Geçerli bir kategori ID girin.'),
  tags: z.array(z.string().max(50)).max(20).optional()
});

exports.updatePostSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    content: z.string().min(1).optional(),
    categoryId: z.coerce.number().int().positive().optional()
  })
  .refine((d) => d.title !== undefined || d.content !== undefined || d.categoryId !== undefined, {
    message: 'Güncellenecek en az bir alan gönderin (title, content veya categoryId).'
  });

exports.acceptAnswerSchema = z.object({
  commentId: uuidStr
});

exports.createCommentSchema = z.object({
  body: z.string().min(1, 'Yorum metni zorunludur.').max(10000, 'Yorum çok uzun.'),
  parent_id: uuidStr.optional().nullable()
});

exports.updateCommentSchema = z.object({
  body: z.string().min(1, 'Yorum metni zorunludur.').max(10000, 'Yorum çok uzun.')
});

exports.castVoteSchema = z.object({
  target_type: z.enum(['post', 'comment'], { message: "target_type 'post' veya 'comment' olmalıdır." }),
  target_id: uuidStr,
  vote_value: z.coerce
    .number()
    .refine((n) => n === 1 || n === -1, { message: 'vote_value 1 veya -1 olmalıdır.' })
});

exports.addFavoriteSchema = z.object({
  postId: uuidStr
});

exports.updateProfileSchema = z
  .object({
    username: z.string().min(2).max(50).optional(),
    display_name: z.string().max(100).optional().nullable(),
    bio: z.string().max(2000).optional().nullable(),
    avatar_url: z.string().url('Geçerli bir avatar URL girin.').optional().nullable()
  })
  .refine(
    (d) =>
      d.username !== undefined ||
      d.display_name !== undefined ||
      d.bio !== undefined ||
      d.avatar_url !== undefined,
    { message: 'Güncellenecek en az bir alan gönderin.' }
  );
