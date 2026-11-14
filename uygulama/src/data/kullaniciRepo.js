// Kullanıcı sorguları
const { yazma, okuma } = require('./db');

// Giriş için kullanıcıyı e-postayla bulur (okuma -> replika)
async function epostaIleBul(eposta) {
  const [satirlar] = await okuma.query(
    `SELECT id, ad, soyad, eposta, sifre_hash, rol, aktif
       FROM kullanicilar WHERE eposta = ?`,
    [eposta]
  );
  return satirlar[0] || null;
}

// Güncel bakiye KAYNAKTAN okunur.
// Neden: rezervasyon/yükleme kaynağa yazılır; replika birkaç milisaniye geriden
// gelebilir (replikasyon gecikmesi). Replikadan okursak kullanıcı az önce düşen
// parayı hâlâ hesabında görebilir.
async function profilGetir(id) {
  const [satirlar] = await yazma.query(
    `SELECT id, ad, soyad, eposta, rol, ogrenci_no, bakiye
       FROM kullanicilar WHERE id = ?`,
    [id]
  );
  return satirlar[0] || null;
}

module.exports = { epostaIleBul, profilGetir };
