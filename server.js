const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// CORS ayarları - tüm domainlerden erişime izin ver
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

// Socket.IO sunucusu
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Masa durumlarını sakla
const tableStates = new Map();
const userTables = new Map();
const activeUsers = new Map(); // username -> socket.id

// Ana sayfa
app.get('/api', (req, res) => {
  res.json({
    message: 'Ejder Kayası Socket.IO Sunucusu',
    version: '1.0.0',
    activeTables: tableStates.size,
    activeUsers: userTables.size
  });
});

// Sunucu durumu
app.get('/status', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeTables: tableStates.size,
    activeUsers: userTables.size
  });
});

// Frontend build'ini servis et (Netlify yerine tek uygulama olarak deploy etmek isteyenler için)
const frontendBuildPath = path.join(__dirname, 'frontend', 'build');
app.use(express.static(frontendBuildPath));
app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  } catch {
    res.status(404).send('Not Found');
  }
});

// Socket bağlantı yönetimi
io.on('connection', (socket) => {
  console.log(`Yeni bağlantı: ${socket.id}`);
  
  // Basit auth: kullanıcı adı kilidi
  socket.on('auth:login', ({ username }) => {
    if (!username || typeof username !== 'string') {
      socket.emit('auth:result', { ok: false, reason: 'Geçersiz kullanıcı' });
      return;
    }
    const lower = username.toLowerCase();
    const exists = activeUsers.get(lower);
    if (exists && exists !== socket.id) {
      socket.emit('auth:result', { ok: false, reason: 'Bu kullanıcı zaten giriş yapmış' });
      return;
    }
    activeUsers.set(lower, socket.id);
    socket.data.username = lower;
    socket.emit('auth:result', { ok: true });
  });

  socket.on('auth:logout', () => {
    const u = socket.data.username;
    if (u) activeUsers.delete(u);
    socket.data.username = undefined;
  });

  // Kullanıcı masaya katılıyor
  socket.on('join', ({ tableId }) => {
    if (!tableId) return;
    
    // Önceki masadan çık
    const previousTable = userTables.get(socket.id);
    if (previousTable && previousTable !== tableId) {
      socket.leave(previousTable);
    }
    
    // Yeni masaya katıl
    socket.join(tableId);
    userTables.set(socket.id, tableId);
    
    // Masa durumunu başlat (eğer yoksa)
    if (!tableStates.has(tableId)) {
      tableStates.set(tableId, {
        title: 'EJDER KAYASI',
        editMode: true,
        chars: [],
        lastUpdate: Date.now()
      });
    }
    
    // Mevcut durumu gönder
    const currentState = tableStates.get(tableId);
    socket.emit('state:patch', { payload: currentState });
    
    // Diğer kullanıcılara bildir
    socket.to(tableId).emit('user:joined', { 
      userId: socket.id, 
      tableId 
    });
    
    console.log(`Kullanıcı ${socket.id} masaya ${tableId} katıldı`);
  });
  
  // Durum güncellemesi
  socket.on('state:update', ({ tableId, payload, originClientId }) => {
    if (!tableId || !payload) return;
    
    const currentState = tableStates.get(tableId) || {};
    const newState = { ...currentState, ...payload, lastUpdate: Date.now() };
    tableStates.set(tableId, newState);
    
    // Masadaki diğer kullanıcılara gönder
    socket.to(tableId).emit('state:patch', { payload, originClientId });
    
    console.log(`Masa ${tableId} güncellendi`);
  });
  
  // Durum patch'i
  socket.on('state:patch', ({ tableId, payload, originClientId }) => {
    if (!tableId || !payload) return;
    
    const currentState = tableStates.get(tableId) || {};
    const newState = { ...currentState, ...payload, lastUpdate: Date.now() };
    tableStates.set(tableId, newState);
    
    // Masadaki diğer kullanıcılara gönder
    socket.to(tableId).emit('state:patch', { payload, originClientId });
  });

  // Müzik kontrolü: GM play/pause yayını
  socket.on('music:control', ({ tableId, payload }) => {
    if (!tableId || !payload) return;
    // Aynı masadaki diğer kullanıcılara gönder
    socket.to(tableId).emit('music:control', { payload });
  });

  // Zar atışı yayını
  socket.on('dice:roll', ({ tableId, payload }) => {
    if (!tableId || !payload) return;
    socket.to(tableId).emit('dice:roll', { payload });
  });
  
  // Bağlantı kesildiğinde
  socket.on('disconnect', () => {
    const u = socket.data.username;
    if (u) activeUsers.delete(u);
    const tableId = userTables.get(socket.id);
    if (tableId) {
      socket.to(tableId).emit('user:left', { 
        userId: socket.id, 
        tableId 
      });
      userTables.delete(socket.id);
      
      // Eğer masada kimse kalmadıysa masayı temizle
      const tableUsers = io.sockets.adapter.rooms.get(tableId);
      if (!tableUsers || tableUsers.size === 0) {
        tableStates.delete(tableId);
        console.log(`Masa ${tableId} temizlendi`);
      }
    }
    
    console.log(`Bağlantı kesildi: ${socket.id}`);
  });
});

// Port ayarı
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Ejder Kayası Socket.IO Sunucusu çalışıyor: http://localhost:${PORT}`);
  console.log(`📊 Aktif masalar: ${tableStates.size}`);
  console.log(`👥 Aktif kullanıcılar: ${userTables.size}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});
