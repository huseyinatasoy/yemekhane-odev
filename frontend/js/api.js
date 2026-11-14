// =====================================================================
// API yardımcısı: tüm sayfalar sunucuyla bu fonksiyon üzerinden konuşur.
// - Oturum token'ını localStorage'da tutar ve her isteğe ekler.
// - Sunucunun döndürdüğü { hata: "..." } mesajını Error olarak fırlatır;
//   sayfalar bu mesajı olduğu gibi ekrana yazar (ör. "Bakiye yetersiz.").
// =====================================================================
const Api = {
  tokenAl() {
    try { return localStorage.getItem('token'); } catch { return null; }
  },
  tokenKaydet(token) {
    try { localStorage.setItem('token', token); } catch { /* özel pencere vb. */ }
  },
  tokenSil() {
    try { localStorage.removeItem('token'); } catch { /* yok say */ }
  },

  async istek(yontem, yol, govde) {
    const basliklar = { Accept: 'application/json' };
    const token = Api.tokenAl();
    if (token) basliklar.Authorization = 'Bearer ' + token;
    if (govde !== undefined) basliklar['Content-Type'] = 'application/json';

    let yanit;
    try {
      yanit = await fetch('/api' + yol, {
        method: yontem,
        headers: basliklar,
        body: govde !== undefined ? JSON.stringify(govde) : undefined,
      });
    } catch {
      throw new Error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.');
    }

    // Oturum düştüyse giriş sayfasına dön
    if (yanit.status === 401 && !yol.startsWith('/giris')) {
      Api.tokenSil();
      location.href = '/index.html?oturum=bitti';
      throw new Error('Oturum süresi doldu.');
    }

    const veri = await yanit.json().catch(() => ({}));
    if (!yanit.ok) {
      throw new Error(veri.hata || 'Beklenmeyen bir hata oluştu (HTTP ' + yanit.status + ').');
    }
    return veri;
  },

  get(yol) { return Api.istek('GET', yol); },
  post(yol, govde = {}) { return Api.istek('POST', yol, govde); },
  put(yol, govde = {}) { return Api.istek('PUT', yol, govde); },
};
