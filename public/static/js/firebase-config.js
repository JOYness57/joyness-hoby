/**
 * ==============================================================================
 * JOYNESSHOBY - FIREBASE BACKEND & FIRESTORE DATABASE SERVICE
 * ==============================================================================
 * Firebase Agent Skill Compliant:
 * - Project ID: joyness-hoby
 * - App ID: 1:542346124070:web:1e6a25629608900e66ffe7
 * - Project Number / Sender ID: 542346124070
 * - Auth Domain: joyness-hoby.firebaseapp.com
 * - Storage Bucket: joyness-hoby.firebasestorage.app
 * 
 * Features:
 * 1. Email/Password Authentication & Registration with profile display name
 * 2. Google Sign-In with popup (firebase.auth.GoogleAuthProvider)
 * 3. Local persistent sessions across page reloads (LOCAL persistence)
 * 4. Cloud Firestore multi-user database:
 *    - users/{uid}/watchlist
 *    - users/{uid}/tcg_cards
 *    - users/{uid}/tcg_decks
 * 5. Automatic starter pack seeding into Firestore upon first login
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. FIREBASE CONFIGURATION OBJECT
// ------------------------------------------------------------------------------
const SAVED_API_KEY = (typeof localStorage !== 'undefined') ? (localStorage.getItem('joyness_firebase_api_key') || '') : '';

const firebaseConfig = {
  apiKey: SAVED_API_KEY || "AIzaSyBoJ1y1Tjey6VjNUud9mRP2T4cDtK0C9B0",
  authDomain: "joyness-hoby.firebaseapp.com",
  projectId: "joyness-hoby",
  storageBucket: "joyness-hoby.firebasestorage.app",
  messagingSenderId: "542346124070",
  appId: "1:542346124070:web:1e6a25629608900e66ffe7",
  measurementId: "G-3DEE82QSSW"
};

// ------------------------------------------------------------------------------
// STARTER LIBRARY (Auto-seeded to Firestore on first user login)
// ------------------------------------------------------------------------------
const STARTER_SEED_DATA = {
  items: [
    { title: "Toriko", category: "anime", current_ep: 9, total_ep: 12, website: "https://crunchyroll.com", status: "marathon", is_favorite: 1, rating: 9, notes: "Peak animation and gourmet hunter fights", image_url: "/static/img/covers/frieren.jpg" },
    { title: "Frieren: Beyond Journey's End", category: "anime", current_ep: 28, total_ep: 28, website: "https://crunchyroll.com", status: "completed", is_favorite: 1, rating: 10, notes: "Masterpiece fantasy storytelling", image_url: "/static/img/covers/frieren.jpg" },
    { title: "Jujutsu Kaisen", category: "anime", current_ep: 18, total_ep: 24, website: "https://netflix.com", status: "watching", is_favorite: 1, rating: 9, notes: "Shibuya incident arc", image_url: "/static/img/covers/jujutsu_kaisen.jpg" },
    { title: "One Piece", category: "anime", current_ep: 1080, total_ep: 1120, website: "https://crunchyroll.com", status: "hold", is_favorite: 0, rating: 8, notes: "Egghead arc, paused for batch watch", image_url: "/static/img/covers/one_piece.jpg" },
    { title: "Boruto: Naruto Next Generations", category: "anime", current_ep: 65, total_ep: 293, website: "https://crunchyroll.com", status: "drop", is_favorite: 0, rating: 5, notes: "Pacing was too slow for me", image_url: "" },
    { title: "Dune: Part Two", category: "movie", current_ep: 1, total_ep: 1, website: "https://max.com", status: "completed", is_favorite: 1, rating: 10, notes: "Cinematic brilliance in IMAX", image_url: "/static/img/covers/dune_two.jpg" },
    { title: "Spirited Away", category: "movie", current_ep: 1, total_ep: 1, website: "https://netflix.com", status: "completed", is_favorite: 1, rating: 10, notes: "Ghibli classic masterpiece", image_url: "/static/img/covers/spirited_away.jpg" },
    { title: "Interstellar", category: "movie", current_ep: 1, total_ep: 1, website: "https://primevideo.com", status: "marathon", is_favorite: 1, rating: 10, notes: "Rewatching this weekend!", image_url: "/static/img/covers/interstellar.jpg" },
    { title: "Shogun", category: "series", current_ep: 7, total_ep: 10, website: "https://disneyplus.com", status: "watching", is_favorite: 1, rating: 10, notes: "Phenomenal historical drama & acting", image_url: "/static/img/covers/shogun.jpg" },
    { title: "Breaking Bad", category: "series", current_ep: 62, total_ep: 62, website: "https://netflix.com", status: "completed", is_favorite: 1, rating: 10, notes: "All-time greatest series", image_url: "/static/img/covers/breaking_bad.jpg" },
    { title: "Solo Leveling", category: "anime", current_ep: 12, total_ep: 12, website: "https://crunchyroll.com", status: "marathon", is_favorite: 1, rating: 9, notes: "Hyped for season 2!", image_url: "/static/img/covers/frieren.jpg" },
    { title: "Cyberpunk: Edgerunners", category: "anime", current_ep: 10, total_ep: 10, website: "https://netflix.com", status: "completed", is_favorite: 1, rating: 10, notes: "Trigger peak direction & OST", image_url: "/static/img/covers/jujutsu_kaisen.jpg" }
  ],
  cards: [
    { name: "Gundam Aerial (Rebuild)", game: "Gundam", card_type: "collection", set_name: "Witch from Mercury Vol. 2", card_number: "GD-001", rarity: "Secret Rare", card_condition: "NM", quantity: 2, price_est: 85.00, price_source: "Yuyu-tei", jpy_price: 12800, status: "owned", priority: "high", is_favorite: 1, image_url: "/static/img/cards/gundam_aerial.jpg", notes: "Foil textured parallel" },
    { name: "RX-78-2 Gundam", game: "Gundam", card_type: "collection", set_name: "Mobile Suit Gundam Base Set", card_number: "GD-078", rarity: "Ultra Rare", card_condition: "NM", quantity: 1, price_est: 120.00, price_source: "Yuyu-tei", jpy_price: 18000, status: "owned", priority: "grail", is_favorite: 1, image_url: "/static/img/cards/rx78_gundam.jpg", notes: "Original Amuro Ray ace unit" },
    { name: "Gundam Barbatos Lupus Rex", game: "Gundam", card_type: "hunting", set_name: "Iron-Blooded Orphans Climax", card_number: "GD-045", rarity: "Parallel Rare", card_condition: "NM", quantity: 1, price_est: 145.00, price_source: "Yuyu-tei", jpy_price: 22000, status: "hunting", priority: "grail", is_favorite: 1, image_url: "/static/img/cards/gundam_aerial.jpg", notes: "Mikazuki Augus final machine chase" },
    { name: "Monkey D. Luffy (Gear 5 Manga)", game: "One Piece", card_type: "collection", set_name: "Awakening of the New Era (OP-05)", card_number: "OP05-119", rarity: "SEC Manga", card_condition: "NM", quantity: 1, price_est: 420.00, price_source: "Collectr", jpy_price: 63000, status: "owned", priority: "grail", is_favorite: 1, image_url: "/static/img/cards/luffy_gear5.jpg", notes: "Original Japanese print" },
    { name: "Roronoa Zoro (Alt Art Leader)", game: "One Piece", card_type: "collection", set_name: "Romance Dawn (OP-01)", card_number: "OP01-001", rarity: "L Parallel", card_condition: "NM", quantity: 1, price_est: 88.00, price_source: "Collectr", jpy_price: 13200, status: "owned", priority: "high", is_favorite: 0, image_url: "/static/img/cards/zoro_alt.jpg", notes: "Red Zoro rush leader" },
    { name: "Pikachu with Grey Felt Hat", game: "Pokemon", card_type: "collection", set_name: "Van Gogh Museum Promo", card_number: "SVP-085", rarity: "Promo", card_condition: "NM", quantity: 1, price_est: 195.00, price_source: "Collectr", jpy_price: 29500, status: "owned", priority: "grail", is_favorite: 1, image_url: "/static/img/cards/pikachu_vangogh.jpg", notes: "Amsterdam Van Gogh Museum exclusive" },
    { name: "Dark Magician Girl", game: "Yu-Gi-Oh", card_type: "collection", set_name: "Magician's Force", card_number: "MFC-000", rarity: "Secret Rare", card_condition: "LP", quantity: 1, price_est: 350.00, price_source: "Collectr", jpy_price: 52500, status: "owned", priority: "grail", is_favorite: 1, image_url: "/static/img/cards/dark_magician_girl.jpg", notes: "1st Edition English print" },
    { name: "The One Ring (001/001 Bounty)", game: "Magic The Gathering", card_type: "hunting", set_name: "Lord of the Rings: Tales of Middle-earth", card_number: "LTR-001", rarity: "Serialized 1 of 1", card_condition: "Mint", quantity: 1, price_est: 2000000.00, price_source: "Collectr", jpy_price: 300000000, status: "hunting", priority: "grail", is_favorite: 1, image_url: "/static/img/cards/the_one_ring.jpg", notes: "The ultimate Holy Grail of modern TCGs" }
  ],
  decks: [
    {
      deck_name: "Gundam Calibarn Permet Score 9",
      game: "Gundam",
      format: "Standard",
      status: "active",
      card_count: 50,
      leader_card: "Gundam Calibarn [Permet 9]",
      image_url: "/static/img/cards/gundam_aerial.jpg",
      notes: "High mobility Gundam deck with Permet score escalation",
      deck_list: [
        { name: "Gundam Calibarn [Permet 9]", qty: 4, category: "Mobile Suit" },
        { name: "Suletta Mercury (Pilot)", qty: 4, category: "Pilot" },
        { name: "Gundam Aerial Rebuild", qty: 4, category: "Mobile Suit" },
        { name: "Miorine Rembran (Operator)", qty: 4, category: "Operator" },
        { name: "Beam Rifle Overboost", qty: 4, category: "Command" },
        { name: "Gund-Bit Shield Array", qty: 4, category: "Command" },
        { name: "Chuchu's Demi Trainer", qty: 3, category: "Mobile Suit" },
        { name: "Guel Dilanza Custom", qty: 3, category: "Mobile Suit" },
        { name: "Asticassia Space Dock", qty: 4, category: "Base" },
        { name: "Quiet Zero Intercept", qty: 4, category: "Command" },
        { name: "Permet Relay Node", qty: 4, category: "Command" },
        { name: "Emergency Repair Protocol", qty: 4, category: "Command" },
        { name: "Gund-Arm Inc. Sponsorship", qty: 4, category: "Base" }
      ]
    },
    {
      deck_name: "Straw Hat Red Rush",
      game: "One Piece",
      format: "Standard",
      status: "active",
      card_count: 50,
      leader_card: "Roronoa Zoro (OP01-001)",
      image_url: "/static/img/cards/zoro_alt.jpg",
      notes: "Fast tempo aggro deck dealing early life damage",
      deck_list: [
        { name: "Roronoa Zoro (Leader)", qty: 1, category: "Leader" },
        { name: "Monkey D. Luffy (Rush)", qty: 4, category: "Character" },
        { name: "Nami (Searcher)", qty: 4, category: "Character" },
        { name: "Brook (Cost 2)", qty: 4, category: "Character" },
        { name: "Sanji (Blocker)", qty: 4, category: "Character" },
        { name: "Chopper (Blocker)", qty: 4, category: "Character" },
        { name: "Radical Beam!", qty: 4, category: "Event" },
        { name: "Guard Point", qty: 4, category: "Event" },
        { name: "Jet Pistol", qty: 4, category: "Event" },
        { name: "Nico Robin (K.O.)", qty: 3, category: "Character" },
        { name: "Usopp (Bounce)", qty: 4, category: "Character" },
        { name: "Otama (Counter 2000)", qty: 4, category: "Character" },
        { name: "Makino (Power Boost)", qty: 4, category: "Character" },
        { name: "Thousand Sunny", qty: 3, category: "Stage" }
      ]
    }
  ]
};

// ------------------------------------------------------------------------------
// 2. UNIVERSAL AUTHENTICATION SERVICE (Firebase Auth + Fallback Native Engine)
// ------------------------------------------------------------------------------
class JoynessAuthService {
  constructor() {
    this.currentUser = null;
    this.sessionToken = null;
    this.authListeners = [];
    this.isFirebaseReady = false;
    this.auth = null;
    this.init();
  }

  isConfiguredApiKey(key) {
    if (!key) return false;
    if (key.includes('YOUR_') || key.includes('PASTE_')) return false;
    return key.startsWith('AIza') && key.length > 20;
  }

  async init() {
    const key = firebaseConfig.apiKey;
    const hasValidKey = this.isConfiguredApiKey(key);

    // 1. Live Google Firebase Authentication
    if (typeof firebase !== 'undefined' && hasValidKey) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();
        // Maintain persistent user login states across sessions
        await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        this.auth.onAuthStateChanged(async (user) => {
          if (user) {
            this.currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              photoURL: user.photoURL || '',
              provider: 'firebase'
            };
            localStorage.setItem('joyness_session_user', JSON.stringify(this.currentUser));
            
            // Auto seed Firestore database if empty on first login
            if (window.JoynessFirestore) {
              window.JoynessFirestore.seedStarterDataIfEmpty(user.uid).catch(e => console.warn('Seed notice:', e));
            }
          } else {
            this.currentUser = null;
            localStorage.removeItem('joyness_session_user');
          }
          this.notifyListeners();
        });

        this.isFirebaseReady = true;
        console.log('✅ Firebase Authentication & Firestore initialized with project:', firebaseConfig.projectId);
        
        // Initialize Firestore Service
        if (typeof JoynessFirestoreService !== 'undefined') {
          window.JoynessFirestore = new JoynessFirestoreService(firebase.firestore());
        }
        return;
      } catch (err) {
        console.warn('Firebase init error, switching to native session engine:', err);
      }
    }

    // 2. Native SQLite Engine (Fallback when API key is pending)
    this.isFirebaseReady = false;
    const savedToken = localStorage.getItem('joyness_session_token');
    const savedUser = localStorage.getItem('joyness_session_user');

    if (savedToken) {
      this.sessionToken = savedToken;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          this.currentUser = data.user;
          localStorage.setItem('joyness_session_user', JSON.stringify(this.currentUser));
        } else if (savedUser) {
          this.currentUser = JSON.parse(savedUser);
        }
      } catch (e) {
        if (savedUser) {
          try { this.currentUser = JSON.parse(savedUser); } catch (_) {}
        }
      }
    } else if (savedUser) {
      try { this.currentUser = JSON.parse(savedUser); } catch (_) {}
    }

    setTimeout(() => this.notifyListeners(), 50);
  }

  saveApiKey(apiKey) {
    if (!apiKey) return;
    apiKey = apiKey.trim();
    localStorage.setItem('joyness_firebase_api_key', apiKey);
    firebaseConfig.apiKey = apiKey;
    window.location.reload();
  }

  removeApiKey() {
    localStorage.removeItem('joyness_firebase_api_key');
    window.location.reload();
  }

  onAuthStateChanged(callback) {
    this.authListeners.push(callback);
    callback(this.currentUser);
  }

  notifyListeners() {
    this.authListeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    });
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getSessionToken() {
    return this.sessionToken || localStorage.getItem('joyness_session_token') || '';
  }

  isLiveFirebase() {
    return this.isFirebaseReady;
  }

  // SIGN UP / REGISTER
  async signUp(email, password, displayName = '') {
    email = email.trim().toLowerCase();
    if (!email || !password) throw new Error('Email and password are required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters long');

    // Live Firebase Sign-up
    if (this.isFirebaseReady && this.auth) {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      if (displayName && userCredential.user.updateProfile) {
        await userCredential.user.updateProfile({ displayName });
      }
      // Create user record in Firestore
      if (window.JoynessFirestore && window.JoynessFirestore.db) {
        await window.JoynessFirestore.db.collection('users').doc(userCredential.user.uid).set({
          email,
          displayName: displayName || email.split('@')[0],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      return userCredential.user;
    }

    // Native SQLite Backend Registration
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: displayName })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Registration failed');
    }

    this.currentUser = data.user;
    this.sessionToken = data.user.token;
    localStorage.setItem('joyness_session_user', JSON.stringify(this.currentUser));
    localStorage.setItem('joyness_session_token', this.sessionToken);
    this.notifyListeners();
    return this.currentUser;
  }

  // LOGIN / SIGN IN
  async login(email, password, rememberMe = true) {
    email = email.trim().toLowerCase();
    if (!email || !password) throw new Error('Email and password are required');

    // Live Firebase Email/Password Sign-in
    if (this.isFirebaseReady && this.auth) {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      // Update lastLogin in Firestore
      if (window.JoynessFirestore && window.JoynessFirestore.db) {
        window.JoynessFirestore.db.collection('users').doc(userCredential.user.uid).set({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
      return userCredential.user;
    }

    // Native SQLite Backend Login
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me: rememberMe })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Invalid email or password');
    }

    this.currentUser = data.user;
    this.sessionToken = data.user.token;

    if (rememberMe) {
      localStorage.setItem('joyness_session_user', JSON.stringify(this.currentUser));
      localStorage.setItem('joyness_session_token', this.sessionToken);
    } else {
      sessionStorage.setItem('joyness_session_user', JSON.stringify(this.currentUser));
      sessionStorage.setItem('joyness_session_token', this.sessionToken);
    }

    this.notifyListeners();
    return this.currentUser;
  }

  // GOOGLE SIGN IN
  async loginWithGoogle() {
    if (this.isFirebaseReady && this.auth) {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await this.auth.signInWithPopup(provider);
      // Update user record in Firestore
      if (window.JoynessFirestore && window.JoynessFirestore.db) {
        window.JoynessFirestore.db.collection('users').doc(result.user.uid).set({
          email: result.user.email,
          displayName: result.user.displayName || result.user.email.split('@')[0],
          photoURL: result.user.photoURL || '',
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
      return result.user;
    }

    // If Firebase is awaiting API key, prompt demo guest login
    return this.loginDemoGuest('google_collector');
  }

  // QUICK DEMO GUEST SESSION
  async loginDemoGuest(username = 'demo_collector') {
    const demoEmail = `${username}@joyness.local`;
    const demoUid = 'demo_' + username;
    this.currentUser = {
      uid: demoUid,
      email: demoEmail,
      displayName: 'Guest Collector',
      provider: 'guest_demo'
    };
    this.sessionToken = 'token_' + demoUid;
    localStorage.setItem('joyness_session_user', JSON.stringify(this.currentUser));
    localStorage.setItem('joyness_session_token', this.sessionToken);
    this.notifyListeners();
    return this.currentUser;
  }

  // LOGOUT
  async logout() {
    if (this.isFirebaseReady && this.auth) {
      try { await this.auth.signOut(); } catch (_) {}
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.sessionToken}` }
      });
    } catch (_) {}

    this.currentUser = null;
    this.sessionToken = null;
    localStorage.removeItem('joyness_session_user');
    localStorage.removeItem('joyness_session_token');
    sessionStorage.removeItem('joyness_session_user');
    sessionStorage.removeItem('joyness_session_token');
    this.notifyListeners();
  }
}

// ------------------------------------------------------------------------------
// 3. CLOUD FIRESTORE MULTI-USER DATABASE SERVICE
// ------------------------------------------------------------------------------
class JoynessFirestoreService {
  constructor(firestoreInstance) {
    this.db = firestoreInstance;
    // Enable offline persistence
    if (this.db) {
      this.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore offline persistence: multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore offline persistence: browser not supported');
        }
      });
    }
  }

  isReady() {
    return Boolean(this.db && window.JoynessAuth && window.JoynessAuth.isLiveFirebase() && window.JoynessAuth.getCurrentUser());
  }

  getUserWatchlistCol(uid) {
    return this.db.collection('users').doc(uid).collection('watchlist');
  }

  getUserCardsCol(uid) {
    return this.db.collection('users').doc(uid).collection('tcg_cards');
  }

  getUserDecksCol(uid) {
    return this.db.collection('users').doc(uid).collection('tcg_decks');
  }

  // ----------------------------------------------------------------------------
  // AUTO-SEED STARTER PACK (On first login with empty collections)
  // ----------------------------------------------------------------------------
  async seedStarterDataIfEmpty(uid) {
    if (!this.db || !uid) return;
    try {
      const watchlistCol = this.getUserWatchlistCol(uid);
      const snapshot = await watchlistCol.limit(1).get();
      if (!snapshot.empty) return; // User already has data

      console.log('Seeding starter collection to Firestore for user:', uid);
      const batch = this.db.batch();

      // Seed Watchlist Items
      STARTER_SEED_DATA.items.forEach(item => {
        const ref = watchlistCol.doc();
        batch.set(ref, {
          ...item,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      // Seed TCG Cards
      const cardsCol = this.getUserCardsCol(uid);
      STARTER_SEED_DATA.cards.forEach(card => {
        const ref = cardsCol.doc();
        batch.set(ref, {
          ...card,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      // Seed TCG Decks
      const decksCol = this.getUserDecksCol(uid);
      STARTER_SEED_DATA.decks.forEach(deck => {
        const ref = decksCol.doc();
        batch.set(ref, {
          ...deck,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log('✅ Firestore starter pack seeded successfully!');
    } catch (err) {
      console.warn('Firestore auto-seed notice:', err);
    }
  }

  // ----------------------------------------------------------------------------
  // WATCHLIST FIRESTORE CRUD
  // ----------------------------------------------------------------------------
  async getWatchlistItems(uid, { category = 'all', status = 'all', search = '', favorites = false, sort = 'title', order = 'asc' } = {}) {
    if (!this.db) return { success: false, items: [] };
    const col = this.getUserWatchlistCol(uid);
    const snap = await col.get();

    let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply Client-Side Filter for maximum indexing flexibility
    if (category === 'favorite' || favorites) {
      items = items.filter(i => Boolean(i.is_favorite));
    } else if (category && category !== 'all') {
      items = items.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
    }

    if (status && status !== 'all') {
      items = items.filter(i => (i.status || '').toLowerCase() === status.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => 
        (i.title || '').toLowerCase().includes(q) ||
        (i.notes || '').toLowerCase().includes(q) ||
        (i.website || '').toLowerCase().includes(q)
      );
    }

    // Sort items
    items.sort((a, b) => {
      let va = a[sort];
      let vb = b[sort];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return order === 'desc' ? 1 : -1;
      if (va > vb) return order === 'desc' ? -1 : 1;
      return 0;
    });

    return { success: true, items };
  }

  async getWatchlistStats(uid) {
    if (!this.db) return { success: false, stats: {} };
    const snap = await this.getUserWatchlistCol(uid).get();
    const items = snap.docs.map(doc => doc.data());

    let total = items.length;
    let watching = 0, marathon = 0, hold = 0, drop = 0, completed = 0, favorites = 0, episodes = 0;
    let anime = 0, movie = 0, series = 0;

    items.forEach(it => {
      const s = (it.status || '').toLowerCase();
      if (s === 'watching') watching++;
      else if (s === 'marathon') marathon++;
      else if (s === 'hold') hold++;
      else if (s === 'drop') drop++;
      else if (s === 'completed') completed++;

      if (it.is_favorite) favorites++;
      episodes += (parseInt(it.current_ep) || 0);

      const c = (it.category || '').toLowerCase();
      if (c === 'anime') anime++;
      else if (c === 'movie') movie++;
      else if (c === 'series') series++;
    });

    return {
      success: true,
      stats: {
        total, watching, marathon, hold, drop, completed,
        favorites, episodes_watched: episodes,
        anime, movie, series
      }
    };
  }

  async addWatchlistItem(uid, data) {
    const col = this.getUserWatchlistCol(uid);
    const docRef = await col.add({
      ...data,
      is_favorite: data.is_favorite ? 1 : 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, item: { id: docRef.id, ...data } };
  }

  async updateWatchlistItem(uid, id, updates) {
    const col = this.getUserWatchlistCol(uid);
    await col.doc(String(id)).set({
      ...updates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
  }

  async deleteWatchlistItem(uid, id) {
    const col = this.getUserWatchlistCol(uid);
    await col.doc(String(id)).delete();
    return { success: true };
  }

  // ----------------------------------------------------------------------------
  // TCG CARDS FIRESTORE CRUD
  // ----------------------------------------------------------------------------
  async getTcgCards(uid, { card_type = 'collection', game = 'all', status = 'all', search = '', favorites = false } = {}) {
    if (!this.db) return { success: false, cards: [] };
    const col = this.getUserCardsCol(uid);
    const snap = await col.get();
    let cards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (favorites) {
      cards = cards.filter(c => Boolean(c.is_favorite));
    } else if (card_type) {
      cards = cards.filter(c => (c.card_type || '').toLowerCase() === card_type.toLowerCase());
    }

    if (game && game !== 'all') {
      cards = cards.filter(c => (c.game || '').toLowerCase() === game.toLowerCase());
    }

    if (status && status !== 'all') {
      cards = cards.filter(c => (c.status || '').toLowerCase() === status.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      cards = cards.filter(c => 
        (c.name || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q) ||
        (c.set_name || '').toLowerCase().includes(q) ||
        (c.card_number || '').toLowerCase().includes(q)
      );
    }

    return { success: true, cards };
  }

  async getTcgStats(uid) {
    if (!this.db) return { success: false, stats: {} };
    const cardsSnap = await this.getUserCardsCol(uid).get();
    const decksSnap = await this.getUserDecksCol(uid).get();

    const cards = cardsSnap.docs.map(doc => doc.data());
    const decks = decksSnap.docs.map(doc => doc.data());

    let collection_count = 0;
    let collection_value = 0.0;
    let hunting_count = 0;
    let hunting_found = 0;
    let tcg_favorites = 0;

    cards.forEach(c => {
      const isHunt = (c.card_type || '').toLowerCase() === 'hunting';
      if (isHunt) {
        hunting_count++;
        if (c.status === 'found') hunting_found++;
      } else {
        const qty = parseInt(c.quantity) || 1;
        collection_count += qty;
        collection_value += ((parseFloat(c.price_est) || 0.0) * qty);
      }
      if (c.is_favorite) tcg_favorites++;
    });

    return {
      success: true,
      stats: {
        collection_count,
        collection_value: Math.round(collection_value * 100) / 100,
        hunting_count,
        hunting_found,
        tcg_favorites,
        deck_total: decks.length
      }
    };
  }

  async addTcgCard(uid, data) {
    const col = this.getUserCardsCol(uid);
    const docRef = await col.add({
      ...data,
      is_favorite: data.is_favorite ? 1 : 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, card: { id: docRef.id, ...data } };
  }

  async updateTcgCard(uid, id, updates) {
    const col = this.getUserCardsCol(uid);
    await col.doc(String(id)).set({
      ...updates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
  }

  async deleteTcgCard(uid, id) {
    const col = this.getUserCardsCol(uid);
    await col.doc(String(id)).delete();
    return { success: true };
  }

  // ----------------------------------------------------------------------------
  // TCG DECKS FIRESTORE CRUD
  // ----------------------------------------------------------------------------
  async getTcgDecks(uid, { game = 'all', search = '' } = {}) {
    if (!this.db) return { success: false, decks: [] };
    const col = this.getUserDecksCol(uid);
    const snap = await col.get();
    let decks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (game && game !== 'all') {
      decks = decks.filter(d => (d.game || '').toLowerCase() === game.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      decks = decks.filter(d => 
        (d.deck_name || '').toLowerCase().includes(q) ||
        (d.leader_card || '').toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q)
      );
    }

    return { success: true, decks };
  }

  async addTcgDeck(uid, data) {
    const col = this.getUserDecksCol(uid);
    const docRef = await col.add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, deck: { id: docRef.id, ...data } };
  }

  async updateTcgDeck(uid, id, updates) {
    const col = this.getUserDecksCol(uid);
    await col.doc(String(id)).set({
      ...updates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
  }

  async deleteTcgDeck(uid, id) {
    const col = this.getUserDecksCol(uid);
    await col.doc(String(id)).delete();
    return { success: true };
  }
}

// ------------------------------------------------------------------------------
// GLOBAL INSTANCES
// ------------------------------------------------------------------------------
window.JoynessAuth = new JoynessAuthService();
window.JoynessFirestore = (typeof firebase !== 'undefined' && firebase.firestore) 
  ? new JoynessFirestoreService(firebase.firestore()) 
  : null;
