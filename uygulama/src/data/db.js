// =====================================================================
// Veri katmanının bağlantı noktası.
// İki ayrı bağlantı havuzu vardır:
//   yazma -> mysql-primary (kaynak): INSERT/UPDATE ve stored procedure çağrıları
//   okuma -> mysql-replica (replika): listeleme ve raporlar
// Uygulamanın geri kalanı veritabanına yalnızca bu klasördeki (data/) dosyalar üzerinden ulaşır.
// =====================================================================
const mysql = require('mysql2/promise');

const ortak = {
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_ADI,
  user: process.env.DB_KULLANICI,
  password: process.env.DB_SIFRE,
  charset: 'utf8mb4',
  timezone: '+03:00',
  dateStrings: true,      // DATE/DATETIME değerleri metin olarak gelir (saat dilimi kayması olmaz)
  decimalNumbers: true,   // DECIMAL değerleri sayı olarak gelir
  connectionLimit: 10,
  waitForConnections: true,
};

const yazma = mysql.createPool({ ...ortak, host: process.env.DB_YAZMA_HOST });
const okuma = mysql.createPool({ ...ortak, host: process.env.DB_OKUMA_HOST });

// Stored procedure çağırır ve dönen tek satırı verir.
// Yordamlar kendi transaction'larını yönettiği için burada BEGIN/COMMIT yoktur.
// mysql2, CALL sonucunu [[satırlar], OkPacket] biçiminde döndürür.
async function yordamCagir(ad, parametreler) {
  const yerTutucular = parametreler.map(() => '?').join(', ');
  const [sonuc] = await yazma.query(`CALL ${ad}(${yerTutucular})`, parametreler);
  return sonuc[0][0];
}

module.exports = { yazma, okuma, yordamCagir };
