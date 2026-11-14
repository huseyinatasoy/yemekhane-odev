// =====================================================================
// Yemekhane Otomasyonu · Web API giriş noktası
// İstek akışı: Apache (/api/...) -> routes -> controller -> data (SQL) -> JSON yanıt
// =====================================================================
const express = require('express');
const router = require('./routes');
const { hataYakalayici } = require('./middleware/hata');
const redis = require('./services/redis');
const menuOnbellek = require('./services/menuOnbellek');

const app = express();
const PORT = 8000;

app.use(express.json());

// Basit istek günlüğü: "GET /api/menu 200 12ms"
app.use((req, res, next) => {
  const baslangic = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - baslangic}ms`);
  });
  next();
});

app.use('/api', router);

// Tanımsız /api yolu
app.use('/api', (req, res) => res.status(404).json({ hata: 'İstenen adres bulunamadı.' }));

app.use(hataYakalayici);

// Önce Redis'e bağlan ve eski yapıdaki menü önbelleğini temizle,
// sonra istekleri kabul etmeye başla
redis.connect().then(async () => {
  await menuOnbellek.eskiKayitlariTemizle();
  app.listen(PORT, () => {
    console.log(`Uygulama ${PORT} portunda çalışıyor.`);
  });
});
