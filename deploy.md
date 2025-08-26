# 🚀 Deployment Rehberi

Bu rehber ile Ejder Kayası UI uygulamanızı internette yayınlayabilir ve arkadaşlarınızla canlı oynayabilirsiniz.

## 📋 Ön Gereksinimler

- [Git](https://git-scm.com/) kurulu
- [Node.js](https://nodejs.org/) 16+ kurulu
- [npm](https://www.npmjs.com/) kurulu
- GitHub hesabı
- Heroku/Railway/Render hesabı (ücretsiz)

## 🌐 Backend Sunucusu Deploy Etme

### Seçenek 1: Heroku (Önerilen - Ücretsiz)

1. **Heroku CLI kurulumu:**
```bash
npm install -g heroku
```

2. **Heroku'ya giriş:**
```bash
heroku login
```

3. **Yeni uygulama oluştur:**
```bash
heroku create ejder-kayasi-socket-XXXX
```

4. **Git repo'yu başlat:**
```bash
git init
git add .
git commit -m "Initial commit"
```

5. **Heroku'ya deploy et:**
```bash
git remote add heroku https://git.heroku.com/ejder-kayasi-socket-XXXX.git
git push heroku main
```

6. **Uygulamayı başlat:**
```bash
heroku ps:scale web=1
```

7. **URL'ini al:**
```bash
heroku open
```

### Seçenek 2: Railway (Ücretsiz)

1. [Railway.app](https://railway.app) hesabı oluştur
2. GitHub repo'yu bağla
3. Otomatik deploy
4. URL'ini kopyala

### Seçenek 3: Render (Ücretsiz)

1. [Render.com](https://render.com) hesabı oluştur
2. "New Web Service" seç
3. GitHub repo'yu bağla
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy et

## 🎨 Frontend Deploy Etme

### Seçenek 1: Vercel (Önerilen - Ücretsiz)

1. **Vercel CLI kurulumu:**
```bash
npm install -g vercel
```

2. **Deploy et:**
```bash
vercel
```

3. **Domain'i kopyala**

### Seçenek 2: Netlify (Ücretsiz)

1. [Netlify.com](https://netlify.com) hesabı oluştur
2. GitHub repo'yu bağla
3. Build Command: `npm run build`
4. Publish Directory: `build`
5. Deploy et

## 🔧 Yapılandırma

### 1. Backend URL'ini Güncelle

Frontend kodunda socket sunucu URL'ini güncelleyin:

```typescript
// ejder_kayasi_ui.tsx dosyasında
const [socketBase, setSocketBase] = useState<string>(() => 
  localStorage.getItem("ejk_socket_url") || "https://YOUR-HEROKU-APP.herokuapp.com"
);
```

### 2. Environment Variables (Opsiyonel)

Heroku'da environment variables ayarlayın:

```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=3001
```

## 🎮 Canlı Oyun Başlatma

### 1. Sunucu URL'ini Paylaş

Arkadaşlarınıza backend sunucu URL'ini verin:
```
https://ejder-kayasi-socket-XXXX.herokuapp.com
```

### 2. Masa ID Belirle

Hepiniz aynı masa ID'sini kullanın:
- `bolum-3`
- `boss-savasi`
- `macera-1`
- `dungeon-crawl`

### 3. Bağlantı Kur

1. Frontend'i açın
2. Sunucu URL'ini girin
3. Masa ID'yi girin
4. "Canlı: AÇIK" butonuna tıklayın
5. "Canlı: BAĞLI" yazısını görün

## 📱 Test Etme

### Yerel Test

1. **Backend'i başlat:**
```bash
cd server
npm install
npm start
```

2. **Frontend'i başlat:**
```bash
npm install
npm start
```

3. **Test et:**
- İki farklı tarayıcıda aç
- Aynı masa ID'yi kullan
- Canlı modu aç
- Değişiklikleri test et

### Online Test

1. **Backend deploy et**
2. **Frontend deploy et**
3. **Arkadaşlarınızla test et**

## 🐛 Sorun Giderme

### Bağlantı Sorunları

```bash
# Heroku loglarını kontrol et
heroku logs --tail

# Sunucu durumunu kontrol et
heroku ps
```

### CORS Hataları

Backend'de CORS ayarlarını kontrol edin:

```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));
```

### Port Sorunları

Heroku otomatik port atar, manuel port belirtmeyin:

```javascript
const PORT = process.env.PORT || 3001;
```

## 📊 Monitoring

### Heroku Dashboard

1. [Heroku Dashboard](https://dashboard.heroku.com) aç
2. Uygulamanızı seç
3. Metrics, logs ve errors'ı kontrol et

### Uygulama Durumu

```bash
# Uygulama durumunu kontrol et
heroku ps

# Logları izle
heroku logs --tail

# Uygulamayı yeniden başlat
heroku restart
```

## 🔄 Güncelleme

### Backend Güncelleme

```bash
git add .
git commit -m "Update backend"
git push heroku main
```

### Frontend Güncelleme

```bash
git add .
git commit -m "Update frontend"
git push origin main
# Vercel/Netlify otomatik deploy eder
```

## 💰 Maliyet

- **Heroku**: Ücretsiz tier (aylık 550-1000 saat)
- **Railway**: Ücretsiz tier (aylık $5 kredi)
- **Render**: Ücretsiz tier (aylık 750 saat)
- **Vercel**: Ücretsiz tier (sınırsız)
- **Netlify**: Ücretsiz tier (sınırsız)

## 🎯 Sonraki Adımlar

1. **Domain satın al** (opsiyonel)
2. **SSL sertifikası** (otomatik)
3. **CDN ekle** (Vercel/Netlify otomatik)
4. **Monitoring ekle** (Heroku add-ons)
5. **Backup sistemi** kur

---

**🎮 Artık arkadaşlarınızla canlı Ejder Kayası oynayabilirsiniz! 🐉**
