# 🐉 Ejder Kayası UI - Canlı Masaüstü RPG

Modern, güzel ve kullanıcı dostu arayüz ile Ejder Kayası masaüstü RPG oyunu. Socket.IO ile gerçek zamanlı senkronizasyon desteği.

## ✨ Özellikler

- **🎮 Edit/Oynatma Modu**: Düzenleme ve oyun modları arasında geçiş
- **👥 Karakter Yönetimi**: Başlık, isim, sınıf, seviye, CAN, statlar (0-5), pasif yetenekler
- **🖼️ Görsel Ekleme**: DATA URL ile kalıcı görsel depolama
- **🎵 Müzik Listesi**: MP3 dosyaları ile müzik çalma (DATA URL ile kalıcı)
- **🎲 Zar Paneli**: D6 zar atma simülasyonu
- **🖼️ Galeri**: Çoklu görsel galeri sistemi
- **💾 LocalStorage**: Veri kalıcılığı
- **📤 JSON İçe/Dışa Aktarım**: Veri yedekleme ve paylaşım
- **🌐 Canlı Senkronizasyon**: Socket.IO ile gerçek zamanlı oyun

## 🚀 Kurulum

### Frontend (React + TypeScript)

1. **Bağımlılıkları yükle:**
```bash
npm install
```

2. **Geliştirme sunucusunu başlat:**
```bash
npm start
```

### Backend (Socket.IO Sunucusu)

1. **Backend klasörüne git:**
```bash
cd server
```

2. **Bağımlılıkları yükle:**
```bash
npm install
```

3. **Sunucuyu başlat:**
```bash
npm start
```

## 🌍 Canlı Oyun Kurulumu

### 1. Sunucu Deploy Etme

#### Heroku (Ücretsiz)
```bash
# Heroku CLI kurulumu
npm install -g heroku

# Heroku'ya giriş
heroku login

# Yeni uygulama oluştur
heroku create ejder-kayasi-socket

# Deploy et
git push heroku main

# Uygulamayı başlat
heroku ps:scale web=1
```

#### Railway (Ücretsiz)
1. [Railway.app](https://railway.app) hesabı oluştur
2. GitHub repo'yu bağla
3. Otomatik deploy

#### Render (Ücretsiz)
1. [Render.com](https://render.com) hesabı oluştur
2. Yeni Web Service oluştur
3. GitHub repo'yu bağla
4. Build Command: `npm install`
5. Start Command: `npm start`

### 2. Frontend Deploy Etme

#### Vercel (Ücretsiz)
```bash
# Vercel CLI kurulumu
npm install -g vercel

# Deploy et
vercel
```

#### Netlify (Ücretsiz)
1. [Netlify.com](https://netlify.com) hesabı oluştur
2. GitHub repo'yu bağla
3. Build Command: `npm run build`
4. Publish Directory: `build`

## 🎯 Kullanım

### Canlı Oyun Başlatma

1. **Sunucu URL'ini ayarla**: Deploy edilen sunucu URL'ini girin
2. **Masa ID belirle**: Arkadaşlarınızla aynı masa ID'sini kullanın
3. **Canlı modu aç**: "Canlı: AÇIK" butonuna tıklayın
4. **Bağlantı durumunu kontrol et**: Yeşil "BAĞLI" yazısını görün

### Masa Paylaşımı

- **Masa ID**: `bolum-3`, `macera-1`, `boss-savasi` gibi
- **Sunucu URL**: `https://ejder-kayasi-socket.herokuapp.com`
- **Bağlantı**: Tüm oyuncular aynı masa ID ve sunucu URL'ini kullanmalı

## 🔧 Teknik Detaylar

### Socket.IO Events

- `join`: Masaya katılma
- `state:update`: Tam durum güncellemesi
- `state:patch`: Kısmi durum güncellemesi
- `user:joined`: Yeni oyuncu katıldı
- `user:left`: Oyuncu ayrıldı

### Veri Yapısı

```typescript
interface CharData {
  ad: string;
  sinif: string;
  seviye: number;
  img?: string | null;
  can: { current: number; max: number };
  stats: { gucl: number; ceviklik: number; zeka: number; irade: number; izcilik: number };
  pasif: string;
}
```

## 📱 Responsive Tasarım

- **Desktop**: 12 sütun grid layout
- **Tablet**: 8+4 sütun düzeni
- **Mobile**: Tek sütun düzeni

## 🎨 UI/UX Özellikleri

- **Modern Tasarım**: Amber/stone renk paleti
- **Görsel Geri Bildirim**: Hover efektleri, durum göstergeleri
- **Erişilebilirlik**: ARIA etiketleri, klavye navigasyonu
- **Performans**: React hooks, memoization

## 🔒 Güvenlik

- **CORS**: Tüm domainlerden erişime izin verilir
- **Input Validation**: Runtime veri doğrulama
- **Error Handling**: Graceful hata yönetimi

## 🐛 Sorun Giderme

### Bağlantı Sorunları

1. **Sunucu URL'ini kontrol et**: HTTPS kullanıldığından emin ol
2. **Firewall**: Port 443 (HTTPS) açık olmalı
3. **CORS**: Sunucu CORS ayarlarını kontrol et

### Performans Sorunları

1. **Görsel boyutları**: Büyük görselleri sıkıştır
2. **Socket bağlantısı**: Gereksiz reconnection'ları önle
3. **LocalStorage**: Büyük veri setlerini chunk'lara böl

## 📈 Gelecek Özellikler

- [ ] Sesli sohbet
- [ ] Video konferans
- [ ] Dice roll history
- [ ] Character sheets export
- [ ] Campaign management
- [ ] Multi-language support

## 🤝 Katkıda Bulunma

1. Fork yap
2. Feature branch oluştur (`git checkout -b feature/amazing-feature`)
3. Commit yap (`git commit -m 'Add amazing feature'`)
4. Push yap (`git push origin feature/amazing-feature`)
5. Pull Request oluştur

## 📄 Lisans

MIT License - detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- **Socket.IO**: Gerçek zamanlı iletişim
- **React**: Modern UI framework
- **Tailwind CSS**: Hızlı styling
- **Ejder Kayası**: Masaüstü RPG sistemi

---

**🎮 İyi oyunlar! Ejder Kayası dünyasında maceranız bol olsun! 🐉**
