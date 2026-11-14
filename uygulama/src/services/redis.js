// =====================================================================
// Redis bağlantısı (tek istemci, tüm uygulama paylaşır).
// Redis iki iş için kullanılır: menü önbelleği ve oturum deposu.
// =====================================================================
const { createClient } = require('redis');

const istemci = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6379),
  },
});

istemci.on('error', (hata) => console.error('[REDIS] Bağlantı hatası:', hata.message));
istemci.on('ready', () => console.log('[REDIS] Bağlandı.'));

module.exports = istemci;
