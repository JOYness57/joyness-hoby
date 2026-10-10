/* ==========================================================================
   JOYNESSHOBY - Complete Frontend Application
   Watchlist Tracker, TCG Vault (Gundam, Images, Collectr & Yuyu-tei)
   Firebase Authentication, Interactive Deck Builder & Auto-Tallying System
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // GLOBAL STATE
  // ==========================================================================
  const state = {
    activeModule: 'watchlist',

    watchlist: {
      category: 'all',
      status: 'all',
      search: '',
      sort: 'id',
      order: 'asc',
      viewMode: 'table',
      items: []
    },

    tcg: {
      subtab: 'collection',
      game: 'all',
      status: 'all',
      search: '',
      cards: [],
      decks: []
    },

    deleteTarget: null,
    authMode: 'login' // 'login' or 'register'
  };

  // ==========================================================================
  // API CLIENT (Multi-User Header Interceptor)
  // ==========================================================================
  async function apiFetch(url, options = {}) {
    const currentUser = window.JoynessAuth ? window.JoynessAuth.getCurrentUser() : null;
    const uid = currentUser && currentUser.uid ? currentUser.uid : 'default';
    const token = window.JoynessAuth ? window.JoynessAuth.getSessionToken() : '';

    options.headers = options.headers || {};
    if (!options.headers['X-User-ID']) {
      options.headers['X-User-ID'] = uid;
    }
    if (token && !options.headers['Authorization']) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, options);
  }

  function isFirestoreActive() {
    return Boolean(window.JoynessFirestore && window.JoynessFirestore.isReady());
  }

  function isStaticHost() {
    const h = (window.location && window.location.hostname) ? window.location.hostname : '';
    return Boolean(
      h.includes('netlify.app') ||
      h.includes('web.app') ||
      h.includes('firebaseapp.com') ||
      h.includes('github.io') ||
      (window.location && window.location.protocol === 'file:')
    );
  }

  async function resolveImageClientSide(title, cat) {
    if (!title) return '';
    try {
      const q = title.toLowerCase().trim();
      const localMaps = {
        'frieren': '/static/img/covers/frieren.jpg',
        'jujutsu': '/static/img/covers/jujutsu_kaisen.jpg',
        'jjk': '/static/img/covers/jujutsu_kaisen.jpg',
        'one piece': '/static/img/covers/one_piece.jpg',
        'dune': '/static/img/covers/dune_two.jpg',
        'spirited': '/static/img/covers/spirited_away.jpg',
        'interstellar': '/static/img/covers/interstellar.jpg',
        'shogun': '/static/img/covers/shogun.jpg',
        'breaking bad': '/static/img/covers/breaking_bad.jpg',
        'solo leveling': '/static/img/covers/solo_leveling.jpg',
        'stranger': '/static/img/covers/stranger_things.jpg',
        'last of us': '/static/img/covers/the_last_of_us.jpg',
        'severance': '/static/img/covers/severance.jpg',
        'toriko': '/static/img/covers/frieren.jpg'
      };
      for (const [key, path] of Object.entries(localMaps)) {
        if (q.includes(key)) return path;
      }

      // 1. Anime open API (Jikan)
      if (cat === 'anime' || !cat) {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.data && data.data.length > 0 && data.data[0].images && data.data[0].images.jpg) {
            return data.data[0].images.jpg.large_image_url || data.data[0].images.jpg.image_url;
          }
        }
      }

      // 2. TV / Series / Movie open API (TVMaze)
      const tvRes = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`);
      if (tvRes.ok) {
        const data = await tvRes.json();
        if (data && data.image && (data.image.original || data.image.medium)) {
          return data.image.original || data.image.medium;
        }
      }
    } catch (e) {
      console.warn('Client-side artwork match error:', e);
    }
    return '';
  }

  function resolveCardInfoClientSide(name, game) {
    if (!name) return null;
    const q = name.toLowerCase().trim();
    const defaults = {
      'aerial': { image_url: '/static/img/cards/gundam_aerial.jpg', set_name: 'Witch from Mercury Vol. 2', card_number: 'GD-001', price_usd: 85.00, price_jpy: 12800, source: 'Yuyu-tei' },
      'rx-78': { image_url: '/static/img/cards/rx78_gundam.jpg', set_name: 'Mobile Suit Gundam Base Set', card_number: 'GD-078', price_usd: 120.00, price_jpy: 18000, source: 'Yuyu-tei' },
      'barbatos': { image_url: '/static/img/cards/gundam_aerial.jpg', set_name: 'Iron-Blooded Orphans Climax', card_number: 'GD-045', price_usd: 145.00, price_jpy: 22000, source: 'Yuyu-tei' },
      'luffy': { image_url: '/static/img/cards/luffy_gear5.jpg', set_name: 'Awakening of the New Era (OP-05)', card_number: 'OP05-119', price_usd: 420.00, price_jpy: 63000, source: 'Collectr' },
      'zoro': { image_url: '/static/img/cards/zoro_alt.jpg', set_name: 'Romance Dawn (OP-01)', card_number: 'OP01-001', price_usd: 88.00, price_jpy: 13200, source: 'Collectr' },
      'pikachu': { image_url: '/static/img/cards/pikachu_vangogh.jpg', set_name: 'Van Gogh Museum Promo', card_number: 'SVP-085', price_usd: 195.00, price_jpy: 29500, source: 'Collectr' },
      'dark magician': { image_url: '/static/img/cards/dark_magician_girl.jpg', set_name: "Magician's Force", card_number: 'MFC-000', price_usd: 350.00, price_jpy: 52500, source: 'Collectr' },
      'one ring': { image_url: '/static/img/cards/the_one_ring.jpg', set_name: 'Lord of the Rings: Tales of Middle-earth', card_number: 'LTR-001', price_usd: 2000000.00, price_jpy: 300000000, source: 'Collectr' }
    };
    for (const [key, val] of Object.entries(defaults)) {
      if (q.includes(key)) return val;
    }
    return null;
  }

  function exportFirestoreWatchlistCsv() {
    const items = state.watchlist.items;
    const header = ['Title', 'Category', 'Status', 'Current Episode', 'Total Episodes', 'Rating', 'Website', 'Notes'];
    const rows = items.map(i => [
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${(i.category || '').replace(/"/g, '""')}"`,
      `"${(i.status || '').replace(/"/g, '""')}"`,
      i.current_ep || 0,
      i.total_ep || 0,
      i.rating || 0,
      `"${(i.website || '').replace(/"/g, '""')}"`,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'joyness_watchlist_export.csv';
    link.click();
    showToast('Exported watchlist to CSV!', 'success');
  }

  // ==========================================================================
  // DOM ELEMENTS
  // ==========================================================================

  // Module Tabs
  const moduleTabWatchlist = document.getElementById('moduleTabWatchlist');
  const moduleTabTcg = document.getElementById('moduleTabTcg');
  const watchlistModule = document.getElementById('watchlistModule');
  const tcgModule = document.getElementById('tcgModule');
  const watchlistHeaderActions = document.getElementById('watchlistHeaderActions');
  const tcgHeaderActions = document.getElementById('tcgHeaderActions');

  // Watchlist DOM
  const tableBody = document.getElementById('tableBody');
  const gridViewWrapper = document.getElementById('gridViewWrapper');
  const tableViewWrapper = document.getElementById('tableViewWrapper');
  const emptyState = document.getElementById('emptyState');
  const visibleCountBadge = document.getElementById('visibleCountBadge');
  const activeTabHeading = document.getElementById('activeTabHeading');
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const statusFilter = document.getElementById('statusFilter');
  const sortBySelect = document.getElementById('sortBy');
  const btnViewTable = document.getElementById('btnViewTable');
  const btnViewGrid = document.getElementById('btnViewGrid');
  const watchlistSubtabs = document.querySelectorAll('#watchlistSubtabs .subtab-btn');
  const statCards = document.querySelectorAll('.stat-card[data-stat-filter]');

  // Watchlist Modal & Inputs
  const itemModal = document.getElementById('itemModal');
  const itemForm = document.getElementById('itemForm');
  const modalTitle = document.getElementById('modalTitle');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');
  const btnEmptyAdd = document.getElementById('btnEmptyAdd');

  const formItemId = document.getElementById('formItemId');
  const formTitle = document.getElementById('formTitle');
  const formCategory = document.getElementById('formCategory');
  const formStatus = document.getElementById('formStatus');
  const formCurrentEp = document.getElementById('formCurrentEp');
  const formTotalEp = document.getElementById('formTotalEp');
  const formRating = document.getElementById('formRating');
  const formWebsite = document.getElementById('formWebsite');
  const formImageUrl = document.getElementById('formImageUrl');
  const posterPreviewImg = document.getElementById('posterPreviewImg');
  const posterTallyTitle = document.getElementById('posterTallyTitle');
  const posterTallySub = document.getElementById('posterTallySub');
  const btnToggleCustomPoster = document.getElementById('btnToggleCustomPoster');
  const customPosterWrap = document.getElementById('customPosterWrap');
  const formNotes = document.getElementById('formNotes');
  const formIsFavorite = document.getElementById('formIsFavorite');
  const presetChips = document.querySelectorAll('.preset-chip');

  // CSV
  const btnExport = document.getElementById('btnExport');
  const csvFileInput = document.getElementById('csvFileInput');

  // TCG DOM
  const tcgSubtabs = document.querySelectorAll('#tcgSubtabs .subtab-btn');
  const tcgSearchInput = document.getElementById('tcgSearchInput');
  const btnTcgClearSearch = document.getElementById('btnTcgClearSearch');
  const tcgGameFilter = document.getElementById('tcgGameFilter');
  const tcgStatusFilter = document.getElementById('tcgStatusFilter');
  const tcgStatusFilterWrapper = document.getElementById('tcgStatusFilterWrapper');
  const tcgSubtabHeading = document.getElementById('tcgSubtabHeading');
  const tcgVisibleCountBadge = document.getElementById('tcgVisibleCountBadge');
  const tcgCardsViewWrapper = document.getElementById('tcgCardsViewWrapper');
  const tcgCardsTableBody = document.getElementById('tcgCardsTableBody');
  const tcgDecksViewWrapper = document.getElementById('tcgDecksViewWrapper');
  const tcgEmptyState = document.getElementById('tcgEmptyState');
  const btnEmptyAddCard = document.getElementById('btnEmptyAddCard');
  const thConditionOrPriority = document.getElementById('thConditionOrPriority');
  const thPriceOrValue = document.getElementById('thPriceOrValue');
  const thCardStatus = document.getElementById('thCardStatus');
  const btnSyncMarketPrices = document.getElementById('btnSyncMarketPrices');
  const btnSyncMarketPricesBanner = document.getElementById('btnSyncMarketPricesBanner');

  // TCG Card Modal & Inputs
  const btnOpenAddCardModal = document.getElementById('btnOpenAddCardModal');
  const btnOpenAddDeckModal = document.getElementById('btnOpenAddDeckModal');
  const tcgCardModal = document.getElementById('tcgCardModal');
  const tcgCardForm = document.getElementById('tcgCardForm');
  const tcgCardModalTitle = document.getElementById('tcgCardModalTitle');
  const btnTcgCloseCardModal = document.getElementById('btnTcgCloseCardModal');
  const btnTcgCancelCardModal = document.getElementById('btnTcgCancelCardModal');

  const formTcgCardId = document.getElementById('formTcgCardId');
  const formTcgCardType = document.getElementById('formTcgCardType');
  const formTcgGame = document.getElementById('formTcgGame');
  const formTcgName = document.getElementById('formTcgName');
  const formTcgSet = document.getElementById('formTcgSet');
  const formTcgNumber = document.getElementById('formTcgNumber');
  const formTcgRarity = document.getElementById('formTcgRarity');
  const formTcgCondition = document.getElementById('formTcgCondition');
  const formTcgPrice = document.getElementById('formTcgPrice');
  const formTcgQty = document.getElementById('formTcgQty');
  const formTcgPriority = document.getElementById('formTcgPriority');
  const formTcgStatus = document.getElementById('formTcgStatus');
  const formTcgImageUrl = document.getElementById('formTcgImageUrl');
  const cardPreviewImg = document.getElementById('cardPreviewImg');
  const imageTallyTitle = document.getElementById('imageTallyTitle');
  const imageTallySub = document.getElementById('imageTallySub');
  const btnToggleCustomCardImage = document.getElementById('btnToggleCustomCardImage');
  const customCardImageWrap = document.getElementById('customCardImageWrap');
  const btnAutoFetchCardData = document.getElementById('btnAutoFetchCardData');
  const cardPriceSourceChip = document.getElementById('cardPriceSourceChip');
  const cardPriceJpyHint = document.getElementById('cardPriceJpyHint');
  const formTcgNotes = document.getElementById('formTcgNotes');
  const formTcgIsFavorite = document.getElementById('formTcgIsFavorite');
  const groupCondition = document.getElementById('groupCondition');
  const groupQuantity = document.getElementById('groupQuantity');
  const groupPriority = document.getElementById('groupPriority');
  const groupHuntStatus = document.getElementById('groupHuntStatus');
  const lblPriceEst = document.getElementById('lblPriceEst');

  // TCG Deck Modal & Deckbuilder Table Elements
  const tcgDeckModal = document.getElementById('tcgDeckModal');
  const tcgDeckForm = document.getElementById('tcgDeckForm');
  const tcgDeckModalTitle = document.getElementById('tcgDeckModalTitle');
  const btnTcgCloseDeckModal = document.getElementById('btnTcgCloseDeckModal');
  const btnTcgCancelDeckModal = document.getElementById('btnTcgCancelDeckModal');

  const formTcgDeckId = document.getElementById('formTcgDeckId');
  const formDeckName = document.getElementById('formDeckName');
  const formDeckGame = document.getElementById('formDeckGame');
  const formDeckStatus = document.getElementById('formDeckStatus');
  const formDeckLeader = document.getElementById('formDeckLeader');
  const formDeckCardCount = document.getElementById('formDeckCardCount');
  const formDeckFormat = document.getElementById('formDeckFormat');
  const formDeckImageUrl = document.getElementById('formDeckImageUrl');
  const formDeckNotes = document.getElementById('formDeckNotes');

  // Deck List Table Builder Elements
  const deckBuilderTableBody = document.getElementById('deckBuilderTableBody');
  const deckBuilderCountPill = document.getElementById('deckBuilderCountPill');
  const btnAddDeckCardRow = document.getElementById('btnAddDeckCardRow');
  const btnTogglePasteMode = document.getElementById('btnTogglePasteMode');
  const deckQuickPasteBox = document.getElementById('deckQuickPasteBox');
  const deckPasteTextarea = document.getElementById('deckPasteTextarea');
  const btnApplyPaste = document.getElementById('btnApplyPaste');
  const btnCancelPaste = document.getElementById('btnCancelPaste');

  // Delete Modal
  const deleteModal = document.getElementById('deleteModal');
  const deleteItemTitle = document.getElementById('deleteItemTitle');
  const btnCancelDelete = document.getElementById('btnCancelDelete');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');

  // Authentication & User Header Elements
  const btnOpenAuthModal = document.getElementById('btnOpenAuthModal');
  const authLoggedOutView = document.getElementById('authLoggedOutView');
  const authLoggedInView = document.getElementById('authLoggedInView');
  const btnUserDropdownToggle = document.getElementById('btnUserDropdownToggle');
  const userAvatarBadge = document.getElementById('userAvatarBadge');
  const userPillEmail = document.getElementById('userPillEmail');
  const userAccountDropdown = document.getElementById('userAccountDropdown');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  const dropdownProviderChip = document.getElementById('dropdownProviderChip');
  const btnCloneStarterData = document.getElementById('btnCloneStarterData');
  const btnOpenFirebaseSetup = document.getElementById('btnOpenFirebaseSetup');
  const btnLogout = document.getElementById('btnLogout');

  // Auth Modal Elements
  const authModal = document.getElementById('authModal');
  const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
  const authModalTitle = document.getElementById('authModalTitle');
  const tabAuthLogin = document.getElementById('tabAuthLogin');
  const tabAuthRegister = document.getElementById('tabAuthRegister');
  const authErrorAlert = document.getElementById('authErrorAlert');
  const authErrorMsg = document.getElementById('authErrorMsg');
  const authSuccessAlert = document.getElementById('authSuccessAlert');
  const authSuccessMsg = document.getElementById('authSuccessMsg');
  const authForm = document.getElementById('authForm');
  const groupDisplayName = document.getElementById('groupDisplayName');
  const authDisplayName = document.getElementById('authDisplayName');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const iconEyePw = document.getElementById('iconEyePw');
  const groupConfirmPassword = document.getElementById('groupConfirmPassword');
  const authConfirmPassword = document.getElementById('authConfirmPassword');
  const authRememberMe = document.getElementById('authRememberMe');
  const btnAuthSubmit = document.getElementById('btnAuthSubmit');
  const authSubmitText = document.getElementById('authSubmitText');
  const btnAuthGoogle = document.getElementById('btnAuthGoogle');
  const btnAuthDemoGuest = document.getElementById('btnAuthDemoGuest');
  const btnOpenFirebaseGuideFromAuth = document.getElementById('btnOpenFirebaseGuideFromAuth');

  // Firebase Setup Guide Modal Elements
  const firebaseGuideModal = document.getElementById('firebaseGuideModal');
  const btnCloseFirebaseGuideModal = document.getElementById('btnCloseFirebaseGuideModal');

  // Mobile Navigation Drawer Elements
  const btnMobileNavToggle = document.getElementById('btnMobileNavToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');
  const btnCloseMobileDrawer = document.getElementById('btnCloseMobileDrawer');

  const mobileDrawerLoggedOutView = document.getElementById('mobileDrawerLoggedOutView');
  const mobileDrawerLoggedInView = document.getElementById('mobileDrawerLoggedInView');
  const btnMobileOpenAuth = document.getElementById('btnMobileOpenAuth');
  const mobileDrawerAvatarBadge = document.getElementById('mobileDrawerAvatarBadge');
  const mobileDrawerUserName = document.getElementById('mobileDrawerUserName');
  const mobileDrawerUserEmail = document.getElementById('mobileDrawerUserEmail');
  const mobileDrawerProviderChip = document.getElementById('mobileDrawerProviderChip');

  const mobileModuleTabWatchlist = document.getElementById('mobileModuleTabWatchlist');
  const mobileModuleTabTcg = document.getElementById('mobileModuleTabTcg');

  const mobileBtnAddWatchlist = document.getElementById('mobileBtnAddWatchlist');
  const mobileBtnAddCard = document.getElementById('mobileBtnAddCard');
  const mobileBtnAddDeck = document.getElementById('mobileBtnAddDeck');
  const mobileBtnSyncPrices = document.getElementById('mobileBtnSyncPrices');
  const mobileBtnExportCsv = document.getElementById('mobileBtnExportCsv');
  const mobileBtnCloneStarter = document.getElementById('mobileBtnCloneStarter');
  const mobileBtnFirebaseGuide = document.getElementById('mobileBtnFirebaseGuide');
  const mobileBtnLogout = document.getElementById('mobileBtnLogout');

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  init();

  function init() {
    bindModuleSwitchEvents();
    bindWatchlistEvents();
    bindTcgEvents();
    bindDeckBuilderEvents();
    bindDeleteModalEvents();
    bindAuthEvents();
    bindFirebaseGuideEvents();
    bindAutoTallyEvents();
    bindMobileDrawerEvents();

    // Hook Auth State Observer
    if (window.JoynessAuth) {
      window.JoynessAuth.onAuthStateChanged(user => {
        updateAuthUI(user);
        reloadAllData();
      });
    } else {
      reloadAllData();
    }
  }

  function reloadAllData() {
    loadWatchlistStats();
    loadWatchlistItems();
    loadTcgStats();
    if (state.activeModule === 'tcg') {
      loadTcgContent();
    }
  }

  // ==========================================================================
  // MODULE SWITCHING
  // ==========================================================================
  function bindModuleSwitchEvents() {
    moduleTabWatchlist.addEventListener('click', () => switchModule('watchlist'));
    moduleTabTcg.addEventListener('click', () => switchModule('tcg'));
  }

  function switchModule(moduleName) {
    state.activeModule = moduleName;
    if (moduleName === 'watchlist') {
      moduleTabWatchlist.classList.add('active');
      moduleTabTcg.classList.remove('active');
      if (mobileModuleTabWatchlist) mobileModuleTabWatchlist.classList.add('active');
      if (mobileModuleTabTcg) mobileModuleTabTcg.classList.remove('active');
      watchlistModule.classList.remove('hidden');
      tcgModule.classList.add('hidden');
      watchlistHeaderActions.classList.remove('hidden');
      tcgHeaderActions.classList.add('hidden');
      loadWatchlistStats();
      loadWatchlistItems();
    } else {
      moduleTabTcg.classList.add('active');
      moduleTabWatchlist.classList.remove('active');
      if (mobileModuleTabTcg) mobileModuleTabTcg.classList.add('active');
      if (mobileModuleTabWatchlist) mobileModuleTabWatchlist.classList.remove('active');
      tcgModule.classList.remove('hidden');
      watchlistModule.classList.add('hidden');
      tcgHeaderActions.classList.remove('hidden');
      watchlistHeaderActions.classList.add('hidden');
      loadTcgStats();
      loadTcgContent();
    }
  }

  // ==========================================================================
  // WATCHLIST LOGIC
  // ==========================================================================
  function bindWatchlistEvents() {
    watchlistSubtabs.forEach(btn => {
      btn.addEventListener('click', () => {
        watchlistSubtabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.watchlist.category = btn.dataset.category;
        updateWatchlistTabHeading();
        loadWatchlistItems();
      });
    });

    statCards.forEach(card => {
      card.addEventListener('click', () => {
        const filter = card.dataset.statFilter;
        if (filter === 'all') {
          setWatchlistSubtab('all');
          statusFilter.value = 'all';
          state.watchlist.status = 'all';
        } else if (filter === 'favorites') {
          setWatchlistSubtab('favorite');
        } else {
          statusFilter.value = filter;
          state.watchlist.status = filter;
        }
        loadWatchlistItems();
      });
    });

    btnViewTable.addEventListener('click', () => switchWatchlistView('table'));
    btnViewGrid.addEventListener('click', () => switchWatchlistView('grid'));

    let searchDebounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      const val = e.target.value.trim();
      state.watchlist.search = val;
      btnClearSearch.classList.toggle('hidden', val.length === 0);
      searchDebounce = setTimeout(() => loadWatchlistItems(), 250);
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      state.watchlist.search = '';
      btnClearSearch.classList.add('hidden');
      loadWatchlistItems();
      searchInput.focus();
    });

    statusFilter.addEventListener('change', (e) => {
      state.watchlist.status = e.target.value;
      loadWatchlistItems();
    });

    sortBySelect.addEventListener('change', (e) => {
      const [col, order] = e.target.value.split('-');
      state.watchlist.sort = col;
      state.watchlist.order = order;
      loadWatchlistItems();
    });

    btnOpenAddModal.addEventListener('click', openAddWatchlistModal);
    btnEmptyAdd.addEventListener('click', openAddWatchlistModal);
    btnCloseModal.addEventListener('click', closeWatchlistModal);
    btnCancelModal.addEventListener('click', closeWatchlistModal);
    itemModal.addEventListener('click', (e) => {
      if (e.target === itemModal) closeWatchlistModal();
    });

    presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        formWebsite.value = chip.dataset.url;
      });
    });

    itemForm.addEventListener('submit', handleWatchlistFormSubmit);

    btnExport.addEventListener('click', () => {
      if (isFirestoreActive()) {
        exportFirestoreWatchlistCsv();
        return;
      }
      const currentUser = window.JoynessAuth ? window.JoynessAuth.getCurrentUser() : null;
      const uid = currentUser && currentUser.uid ? currentUser.uid : 'default';
      window.location.href = `/api/export/csv?user_id=${encodeURIComponent(uid)}`;
      showToast('Exporting watchlist CSV...', 'success');
    });

    csvFileInput.addEventListener('change', handleImportCSV);
  }

  function setWatchlistSubtab(category) {
    state.watchlist.category = category;
    watchlistSubtabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    updateWatchlistTabHeading();
  }

  function updateWatchlistTabHeading() {
    const titles = {
      all: 'All Watchlist Titles',
      anime: 'Anime Watchlist',
      movie: 'Movie Watchlist',
      series: 'Series / TV Shows',
      favorite: 'Favorites Collection ★'
    };
    activeTabHeading.textContent = titles[state.watchlist.category] || 'Watchlist';
  }

  function switchWatchlistView(mode) {
    state.watchlist.viewMode = mode;
    if (mode === 'table') {
      btnViewTable.classList.add('active');
      btnViewGrid.classList.remove('active');
      tableViewWrapper.classList.remove('hidden');
      gridViewWrapper.classList.add('hidden');
    } else {
      btnViewGrid.classList.add('active');
      btnViewTable.classList.remove('active');
      gridViewWrapper.classList.remove('hidden');
      tableViewWrapper.classList.add('hidden');
    }
  }

  async function loadWatchlistItems() {
    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        const data = await window.JoynessFirestore.getWatchlistItems(currentUser.uid, {
          category: state.watchlist.category,
          status: state.watchlist.status,
          search: state.watchlist.search,
          sort: state.watchlist.sort,
          order: state.watchlist.order
        });
        if (data.success) {
          state.watchlist.items = data.items;
          renderWatchlistItems();
          return;
        }
      }

      // Guest / Offline fallback for static hosts (Netlify / GitHub Pages)
      if (isStaticHost() && window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getWatchlistItems({
          category: state.watchlist.category,
          status: state.watchlist.status,
          search: state.watchlist.search,
          sort: state.watchlist.sort,
          order: state.watchlist.order
        });
        if (data.success) {
          state.watchlist.items = data.items;
          renderWatchlistItems();
          return;
        }
      }

      const params = new URLSearchParams();
      if (state.watchlist.category === 'favorite') {
        params.append('favorites', '1');
      } else if (state.watchlist.category !== 'all') {
        params.append('category', state.watchlist.category);
      }

      if (state.watchlist.status !== 'all') {
        params.append('status', state.watchlist.status);
      }

      if (state.watchlist.search) {
        params.append('search', state.watchlist.search);
      }

      params.append('sort', state.watchlist.sort);
      params.append('order', state.watchlist.order);

      const res = await apiFetch(`/api/items?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          state.watchlist.items = data.items;
          renderWatchlistItems();
          return;
        }
      }

      // If backend 404s, use JoynessGuestStore
      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getWatchlistItems({
          category: state.watchlist.category,
          status: state.watchlist.status,
          search: state.watchlist.search,
          sort: state.watchlist.sort,
          order: state.watchlist.order
        });
        if (data.success) {
          state.watchlist.items = data.items;
          renderWatchlistItems();
          return;
        }
      }
    } catch (err) {
      console.warn('API error, falling back to local store:', err);
      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getWatchlistItems({
          category: state.watchlist.category,
          status: state.watchlist.status,
          search: state.watchlist.search,
          sort: state.watchlist.sort,
          order: state.watchlist.order
        });
        if (data.success) {
          state.watchlist.items = data.items;
          renderWatchlistItems();
          return;
        }
      }
      showToast('Failed to load watchlist items', 'error');
    }
  }

  async function loadWatchlistStats() {
    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        const data = await window.JoynessFirestore.getWatchlistStats(currentUser.uid);
        if (data.success) {
          applyWatchlistStats(data.stats);
          return;
        }
      }

      if (isStaticHost() && window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getWatchlistStats();
        if (data.success) {
          applyWatchlistStats(data.stats);
          return;
        }
      }

      const res = await apiFetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          applyWatchlistStats(data.stats);
          return;
        }
      }

      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getWatchlistStats();
        if (data.success) applyWatchlistStats(data.stats);
      }
    } catch (err) {
      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getWatchlistStats();
        if (data.success) applyWatchlistStats(data.stats);
      }
    }
  }

  function applyWatchlistStats(s) {
    if (!s) return;
    const setT = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setT('statTotal', s.total || 0);
    setT('statWatching', s.watching || 0);
    setT('statMarathon', s.marathon || 0);
    setT('statHold', s.hold || 0);
    setT('statDrop', s.drop || 0);
    setT('statFavorites', s.favorites || 0);
    setT('statEpisodes', s.episodes_watched || 0);

    setT('countAll', s.total || 0);
    setT('countAnime', s.anime || 0);
    setT('countMovie', s.movie || 0);
    setT('countSeries', s.series || 0);
    setT('countFavorite', s.favorites || 0);
  }

  function renderWatchlistItems() {
    const items = state.watchlist.items;
    visibleCountBadge.textContent = `Showing ${items.length} titles`;

    if (items.length === 0) {
      tableBody.innerHTML = '';
      gridViewWrapper.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    renderWatchlistTable(items);
    renderWatchlistGrid(items);
  }

  function renderWatchlistTable(items) {
    tableBody.innerHTML = '';
    items.forEach((item, index) => {
      const tr = document.createElement('tr');
      const webDisplay = formatWebsiteDisplay(item.website);
      const statusMarkup = getStatusMarkup(item.status, item.id);

      const posterThumb = item.image_url
        ? `<img src="${escapeHtml(item.image_url)}" class="table-poster-thumb" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.outerHTML='<div class=\\'no-thumb-placeholder\\'><i class=\\'ri-film-line\\'></i></div>'">`
        : `<div class="no-thumb-placeholder"><i class="ri-film-line"></i></div>`;

      tr.innerHTML = `
        <td class="col-fav">
          <button class="btn-fav ${item.is_favorite ? 'active' : ''}" title="${item.is_favorite ? 'Remove Favorite' : 'Add to Favorite'}" onclick="window.joynessHobby.toggleFavorite(${item.id}, ${item.is_favorite})">
            <i class="${item.is_favorite ? 'ri-star-fill' : 'ri-star-line'}"></i>
          </button>
        </td>
        <td class="col-no">${index + 1}</td>
        <td>${posterThumb}</td>
        <td class="col-name">
          <div class="title-cell">
            <span class="title-text">${escapeHtml(item.title)}</span>
            ${item.notes ? `<span class="title-note" title="${escapeHtml(item.notes)}">${escapeHtml(item.notes)}</span>` : ''}
          </div>
        </td>
        <td class="col-category">
          <span class="category-badge ${item.category}">${item.category.toUpperCase()}</span>
        </td>
        <td class="col-episode">
          <div class="episode-stepper">
            <button class="step-btn" title="Decrease episode" onclick="window.joynessHobby.stepEpisode(${item.id}, ${item.current_ep}, -1)">
              <i class="ri-subtract-line"></i>
            </button>
            <span class="ep-display">${item.current_ep}</span>
            <span class="ep-total">/ ${item.total_ep > 0 ? item.total_ep : '?'}</span>
            <button class="step-btn" title="Increase episode" onclick="window.joynessHobby.stepEpisode(${item.id}, ${item.current_ep}, 1)">
              <i class="ri-add-line"></i>
            </button>
          </div>
        </td>
        <td class="col-website">${webDisplay}</td>
        <td class="col-status">${statusMarkup}</td>
        <td class="col-rating">
          <span class="rating-pill"><i class="ri-star-fill"></i> ${item.rating > 0 ? `${item.rating}/10` : '-'}</span>
        </td>
        <td class="col-actions">
          <div class="row-actions">
            <button class="btn-icon-action" title="Edit details" onclick="window.joynessHobby.openEditWatchlistModal(${item.id})">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn-icon-action delete" title="Delete" onclick="window.joynessHobby.promptDelete('watchlist', ${item.id}, '${escapeHtml(item.title)}')">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function renderWatchlistGrid(items) {
    gridViewWrapper.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card-item';
      const percent = item.total_ep > 0 ? Math.min(100, Math.round((item.current_ep / item.total_ep) * 100)) : 0;
      const webDisplay = formatWebsiteDisplay(item.website);

      card.innerHTML = `
        <div>
          ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" class="card-poster-hero" alt="${escapeHtml(item.title)}" loading="lazy">` : ''}

          <div class="card-top-bar">
            <span class="category-badge ${item.category}">${item.category.toUpperCase()}</span>
            <button class="btn-fav ${item.is_favorite ? 'active' : ''}" onclick="window.joynessHobby.toggleFavorite(${item.id}, ${item.is_favorite})">
              <i class="${item.is_favorite ? 'ri-star-fill' : 'ri-star-line'}"></i>
            </button>
          </div>

          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          ${item.notes ? `<p class="card-notes">${escapeHtml(item.notes)}</p>` : ''}

          <div class="card-progress-bar">
            <div class="card-progress-fill" style="width: ${percent}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="episode-stepper">
              <button class="step-btn" onclick="window.joynessHobby.stepEpisode(${item.id}, ${item.current_ep}, -1)">
                <i class="ri-subtract-line"></i>
              </button>
              <span class="ep-display">${item.current_ep} / ${item.total_ep > 0 ? item.total_ep : '?'} eps</span>
              <button class="step-btn" onclick="window.joynessHobby.stepEpisode(${item.id}, ${item.current_ep}, 1)">
                <i class="ri-add-line"></i>
              </button>
            </div>
            <span class="rating-pill"><i class="ri-star-fill"></i> ${item.rating > 0 ? item.rating : '-'}/10</span>
          </div>

          <div style="margin-bottom: 12px;">${webDisplay}</div>
        </div>

        <div class="card-footer">
          <div>${getStatusMarkup(item.status, item.id)}</div>
          <div class="row-actions">
            <button class="btn-icon-action" title="Edit" onclick="window.joynessHobby.openEditWatchlistModal(${item.id})">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn-icon-action delete" title="Delete" onclick="window.joynessHobby.promptDelete('watchlist', ${item.id}, '${escapeHtml(item.title)}')">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </div>
      `;
      gridViewWrapper.appendChild(card);
    });
  }

  function openAddWatchlistModal() {
    formItemId.value = '';
    itemForm.reset();
    formCategory.value = (state.watchlist.category !== 'all' && state.watchlist.category !== 'favorite') ? state.watchlist.category : 'anime';
    formStatus.value = 'watching';
    formCurrentEp.value = 1;
    formTotalEp.value = 12;
    formRating.value = 8;
    formImageUrl.value = '';
    customPosterWrap.classList.add('hidden');
    posterPreviewImg.src = '/static/img/covers/frieren.jpg';
    posterTallyTitle.innerHTML = '<i class="ri-magic-line"></i> Cover auto-matched';
    posterTallySub.textContent = 'Type or edit title above — cover tallies automatically.';
    formIsFavorite.checked = (state.watchlist.category === 'favorite');
    modalTitle.innerHTML = '<i class="ri-add-box-line"></i> Add New Title';
    itemModal.classList.remove('hidden');
    formTitle.focus();
  }

  function closeWatchlistModal() {
    itemModal.classList.add('hidden');
  }

  async function handleWatchlistFormSubmit(e) {
    e.preventDefault();
    const id = formItemId.value;
    const payload = {
      title: formTitle.value.trim(),
      category: formCategory.value,
      status: formStatus.value,
      current_ep: parseInt(formCurrentEp.value) || 0,
      total_ep: parseInt(formTotalEp.value) || 0,
      rating: parseInt(formRating.value) || 0,
      website: formWebsite.value.trim(),
      image_url: formImageUrl.value.trim(),
      notes: formNotes.value.trim(),
      is_favorite: formIsFavorite.checked ? 1 : 0
    };

    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        if (id) {
          await window.JoynessFirestore.updateWatchlistItem(currentUser.uid, id, payload);
        } else {
          await window.JoynessFirestore.addWatchlistItem(currentUser.uid, payload);
        }
        closeWatchlistModal();
        showToast(id ? 'Title updated!' : 'Title added to watchlist!', 'success');
        loadWatchlistStats();
        loadWatchlistItems();
        return;
      }

      if (isStaticHost() && window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateWatchlistItem(id, payload);
        } else {
          window.JoynessGuestStore.addWatchlistItem(payload);
        }
        closeWatchlistModal();
        showToast(id ? 'Title updated!' : 'Title added to watchlist!', 'success');
        loadWatchlistStats();
        loadWatchlistItems();
        return;
      }

      const url = id ? `/api/items/${id}` : '/api/items';
      const method = id ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          closeWatchlistModal();
          showToast(id ? 'Title updated!' : 'Title added to watchlist!', 'success');
          loadWatchlistStats();
          loadWatchlistItems();
          return;
        }
      }

      // If backend offline or 404
      if (window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateWatchlistItem(id, payload);
        } else {
          window.JoynessGuestStore.addWatchlistItem(payload);
        }
        closeWatchlistModal();
        showToast(id ? 'Title updated!' : 'Title added to watchlist!', 'success');
        loadWatchlistStats();
        loadWatchlistItems();
        return;
      }
    } catch (err) {
      if (window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateWatchlistItem(id, payload);
        } else {
          window.JoynessGuestStore.addWatchlistItem(payload);
        }
        closeWatchlistModal();
        showToast(id ? 'Title updated!' : 'Title added to watchlist!', 'success');
        loadWatchlistStats();
        loadWatchlistItems();
        return;
      }
      console.error(err);
      showToast('Error saving item', 'error');
    }
  }

  async function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    showToast('Importing spreadsheet...', 'info');
    try {
      if (isStaticHost() || !window.JoynessAuth.isLiveFirebase()) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
          if (parts[0]) {
            const item = {
              title: parts[0],
              category: parts[1] || 'anime',
              status: parts[2] || 'watching',
              current_ep: parseInt(parts[3]) || 0,
              total_ep: parseInt(parts[4]) || 0,
              rating: parseInt(parts[5]) || 0,
              website: parts[6] || '',
              notes: parts[7] || ''
            };
            if (isFirestoreActive()) {
              await window.JoynessFirestore.addWatchlistItem(window.JoynessAuth.getCurrentUser().uid, item);
            } else if (window.JoynessGuestStore) {
              window.JoynessGuestStore.addWatchlistItem(item);
            }
            imported++;
          }
        }
        showToast(`Successfully imported ${imported} titles!`, 'success');
        csvFileInput.value = '';
        loadWatchlistStats();
        loadWatchlistItems();
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/api/import/csv', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showToast(`Successfully imported ${data.count} titles!`, 'success');
        csvFileInput.value = '';
        loadWatchlistStats();
        loadWatchlistItems();
      } else {
        showToast(data.error || 'Failed to import CSV', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Import failed', 'error');
    }
  }

  // ==========================================================================
  // TCG VAULT LOGIC (Cards)
  // ==========================================================================
  function bindTcgEvents() {
    tcgSubtabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tcgSubtabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.tcg.subtab = btn.dataset.tcgSubtab;
        updateTcgSubtabView();
        loadTcgContent();
      });
    });

    let tcgSearchDebounce;
    tcgSearchInput.addEventListener('input', (e) => {
      clearTimeout(tcgSearchDebounce);
      const val = e.target.value.trim();
      state.tcg.search = val;
      btnTcgClearSearch.classList.toggle('hidden', val.length === 0);
      tcgSearchDebounce = setTimeout(() => loadTcgContent(), 250);
    });

    btnTcgClearSearch.addEventListener('click', () => {
      tcgSearchInput.value = '';
      state.tcg.search = '';
      btnTcgClearSearch.classList.add('hidden');
      loadTcgContent();
      tcgSearchInput.focus();
    });

    tcgGameFilter.addEventListener('change', (e) => {
      state.tcg.game = e.target.value;
      loadTcgContent();
    });

    tcgStatusFilter.addEventListener('change', (e) => {
      state.tcg.status = e.target.value;
      loadTcgContent();
    });

    btnOpenAddCardModal.addEventListener('click', () => openAddTcgCardModal());
    btnEmptyAddCard.addEventListener('click', () => openAddTcgCardModal());
    btnTcgCloseCardModal.addEventListener('click', closeTcgCardModal);
    btnTcgCancelCardModal.addEventListener('click', closeTcgCardModal);
    tcgCardModal.addEventListener('click', (e) => {
      if (e.target === tcgCardModal) closeTcgCardModal();
    });

    formTcgCardType.addEventListener('change', (e) => {
      toggleCardFormFields(e.target.value);
    });

    // Market Price Sync
    if (btnSyncMarketPrices) {
      btnSyncMarketPrices.addEventListener('click', handleSyncAllMarketPrices);
    }
    if (btnSyncMarketPricesBanner) {
      btnSyncMarketPricesBanner.addEventListener('click', handleSyncAllMarketPrices);
    }

    tcgCardForm.addEventListener('submit', handleTcgCardFormSubmit);
  }

  async function handleSyncAllMarketPrices() {
    showToast('Fetching latest market prices from Collectr & Yuyu-tei...', 'info');
    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        const cardsRes = await window.JoynessFirestore.getTcgCards(currentUser.uid);
        if (cardsRes.success && cardsRes.cards.length > 0) {
          let updatedCount = 0;
          for (const card of cardsRes.cards) {
            try {
              const params = new URLSearchParams({
                name: card.name,
                game: card.game || 'One Piece',
                set_name: card.set_name || '',
                card_number: card.card_number || '',
                condition: card.card_condition || 'NM'
              });
              const res = await apiFetch(`/api/tcg/auto_card_info?${params.toString()}`);
              const data = await res.json();
              if (data.success && data.card && data.card.price_usd > 0) {
                await window.JoynessFirestore.updateTcgCard(currentUser.uid, card.id, {
                  price_est: data.card.price_usd,
                  price_source: data.card.source,
                  jpy_price: data.card.price_jpy || 0
                });
                updatedCount++;
              }
            } catch (_) {}
          }
          showToast(`Market prices updated for ${updatedCount} cards!`, 'success');
          loadTcgStats();
          loadTcgContent();
          return;
        }
      }

      const res = await apiFetch('/api/tcg/sync_all_prices', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Market prices updated!', 'success');
        loadTcgStats();
        loadTcgContent();
      } else {
        showToast(data.error || 'Sync failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error syncing market prices', 'error');
    }
  }

  function updateTcgSubtabView() {
    const subtab = state.tcg.subtab;
    const headings = {
      collection: 'Collection Cards (Owned)',
      hunting: 'Hunting / Chase List (Wishlist)',
      decks: 'Deck Builder & Decks List',
      favorites: 'Favorite Cards & Grails ★'
    };
    tcgSubtabHeading.textContent = headings[subtab] || 'TCG Vault';

    if (subtab === 'hunting') {
      tcgStatusFilterWrapper.classList.remove('hidden');
    } else {
      tcgStatusFilterWrapper.classList.add('hidden');
    }

    if (subtab === 'decks') {
      tcgCardsViewWrapper.classList.add('hidden');
      tcgDecksViewWrapper.classList.remove('hidden');
    } else {
      tcgCardsViewWrapper.classList.remove('hidden');
      tcgDecksViewWrapper.classList.add('hidden');

      if (subtab === 'hunting') {
        thConditionOrPriority.textContent = 'Priority';
        thPriceOrValue.textContent = 'Target Price';
        thCardStatus.textContent = 'Hunt Status';
      } else {
        thConditionOrPriority.textContent = 'Condition';
        thPriceOrValue.textContent = 'Est. Value';
        thCardStatus.textContent = 'Status';
      }
    }
  }

  function toggleCardFormFields(cardType) {
    if (cardType === 'hunting') {
      groupCondition.classList.add('hidden');
      groupQuantity.classList.add('hidden');
      groupPriority.classList.remove('hidden');
      groupHuntStatus.classList.remove('hidden');
      lblPriceEst.textContent = 'Target Price ($ USD)';
    } else {
      groupCondition.classList.remove('hidden');
      groupQuantity.classList.remove('hidden');
      groupPriority.classList.add('hidden');
      groupHuntStatus.classList.add('hidden');
      lblPriceEst.textContent = 'Est. Value ($ USD)';
    }
  }

  function openAddTcgCardModal() {
    formTcgCardId.value = '';
    tcgCardForm.reset();
    formTcgCardType.value = (state.tcg.subtab === 'hunting') ? 'hunting' : 'collection';
    toggleCardFormFields(formTcgCardType.value);
    formTcgGame.value = (state.tcg.game !== 'all') ? state.tcg.game : 'Gundam';
    formTcgCondition.value = 'NM';
    formTcgQty.value = 1;
    formTcgPriority.value = 'medium';
    formTcgStatus.value = (formTcgCardType.value === 'hunting') ? 'hunting' : 'owned';
    formTcgImageUrl.value = '';
    customCardImageWrap.classList.add('hidden');
    cardPreviewImg.src = '/static/img/cards/gundam_aerial.jpg';
    cardPriceSourceChip.innerHTML = '<i class="ri-sparkling-fill"></i> Auto-pricing ready';
    cardPriceJpyHint.textContent = '';
    formTcgIsFavorite.checked = (state.tcg.subtab === 'favorites');

    tcgCardModalTitle.innerHTML = '<i class="ri-vip-diamond-line"></i> Add Card to Vault';
    tcgCardModal.classList.remove('hidden');
    formTcgName.focus();
  }

  function closeTcgCardModal() {
    tcgCardModal.classList.add('hidden');
  }

  function loadTcgContent() {
    if (state.tcg.subtab === 'decks') {
      loadTcgDecks();
    } else {
      loadTcgCards();
    }
  }

  async function loadTcgStats() {
    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        const data = await window.JoynessFirestore.getTcgStats(currentUser.uid);
        if (data.success) {
          applyTcgStats(data.stats);
          return;
        }
      }

      if (isStaticHost() && window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgStats();
        if (data.success) {
          applyTcgStats(data.stats);
          return;
        }
      }

      const res = await apiFetch('/api/tcg/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          applyTcgStats(data.stats);
          return;
        }
      }

      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgStats();
        if (data.success) applyTcgStats(data.stats);
      }
    } catch (err) {
      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgStats();
        if (data.success) applyTcgStats(data.stats);
      }
    }
  }

  function applyTcgStats(s) {
    if (!s) return;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('tcgStatCollection', s.collection_count || 0);
    const colVal = s.collection_value !== undefined ? s.collection_value : (s.total_value || 0);
    setVal('tcgStatValue', `$${(Number(colVal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setVal('tcgStatHunting', s.hunting_count || 0);
    setVal('tcgStatFound', s.hunting_found || 0);
    setVal('tcgStatDecks', s.deck_total || 0);
    setVal('tcgStatFavorites', s.tcg_favorites || 0);

    setVal('tcgCountCollection', s.collection_count || 0);
    setVal('tcgCountHunting', s.hunting_count || 0);
    setVal('tcgCountDecks', s.deck_total || 0);
    setVal('tcgCountFavorites', s.tcg_favorites || 0);
  }

  async function loadTcgCards() {
    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        const data = await window.JoynessFirestore.getTcgCards(currentUser.uid, {
          card_type: (state.tcg.subtab === 'hunting') ? 'hunting' : (state.tcg.subtab === 'collection' ? 'collection' : ''),
          game: state.tcg.game,
          status: state.tcg.status,
          search: state.tcg.search,
          favorites: (state.tcg.subtab === 'favorites')
        });
        if (data.success) {
          state.tcg.cards = data.cards;
          renderTcgCards();
          return;
        }
      }

      if (isStaticHost() && window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgCards({
          card_type: (state.tcg.subtab === 'hunting') ? 'hunting' : (state.tcg.subtab === 'collection' ? 'collection' : ''),
          game: state.tcg.game,
          status: state.tcg.status,
          search: state.tcg.search,
          favorites: (state.tcg.subtab === 'favorites')
        });
        if (data.success) {
          state.tcg.cards = data.cards;
          renderTcgCards();
          return;
        }
      }

      const params = new URLSearchParams();

      if (state.tcg.subtab === 'favorites') {
        params.append('favorites', '1');
      } else if (state.tcg.subtab === 'collection') {
        params.append('card_type', 'collection');
      } else if (state.tcg.subtab === 'hunting') {
        params.append('card_type', 'hunting');
        if (state.tcg.status !== 'all') {
          params.append('status', state.tcg.status);
        }
      }

      if (state.tcg.game !== 'all') {
        params.append('game', state.tcg.game);
      }

      if (state.tcg.search) {
        params.append('search', state.tcg.search);
      }

      const res = await apiFetch(`/api/tcg/cards?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          state.tcg.cards = data.cards;
          renderTcgCards();
          return;
        }
      }

      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgCards({
          card_type: (state.tcg.subtab === 'hunting') ? 'hunting' : (state.tcg.subtab === 'collection' ? 'collection' : ''),
          game: state.tcg.game,
          status: state.tcg.status,
          search: state.tcg.search,
          favorites: (state.tcg.subtab === 'favorites')
        });
        if (data.success) {
          state.tcg.cards = data.cards;
          renderTcgCards();
          return;
        }
      }
    } catch (err) {
      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgCards({
          card_type: (state.tcg.subtab === 'hunting') ? 'hunting' : (state.tcg.subtab === 'collection' ? 'collection' : ''),
          game: state.tcg.game,
          status: state.tcg.status,
          search: state.tcg.search,
          favorites: (state.tcg.subtab === 'favorites')
        });
        if (data.success) {
          state.tcg.cards = data.cards;
          renderTcgCards();
          return;
        }
      }
      console.error(err);
      showToast('Failed to load TCG cards', 'error');
    }
  }

  function renderTcgCards() {
    const cards = state.tcg.cards;
    tcgVisibleCountBadge.textContent = `${cards.length} cards`;

    if (cards.length === 0) {
      tcgCardsTableBody.innerHTML = '';
      tcgEmptyState.classList.remove('hidden');
      return;
    }

    tcgEmptyState.classList.add('hidden');
    tcgCardsTableBody.innerHTML = '';

    cards.forEach((card, index) => {
      const tr = document.createElement('tr');
      const gameClass = card.game.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const isHunting = card.card_type === 'hunting';

      let statusMarkup = '';
      if (isHunting) {
        const statuses = {
          hunting: { label: '🔥 Hunting', class: 'hunting' },
          found: { label: '✅ Found', class: 'found' },
          ordered: { label: '📦 Ordered', class: 'ordered' },
          trading: { label: '🔄 Trading', class: 'trading' }
        };
        const s = statuses[card.status] || statuses.hunting;
        statusMarkup = `
          <div class="hunt-status-pill ${s.class}" title="Click to cycle status" onclick="window.joynessHobby.cycleHuntStatus(${card.id}, '${card.status}')">
            ${s.label}
          </div>
        `;
      } else {
        statusMarkup = `<span class="legend-badge watching"><span class="dot"></span> Owned (${card.quantity}x)</span>`;
      }

      const conditionOrPriorityHtml = isHunting
        ? `<span class="priority-pill ${card.priority}">${card.priority === 'grail' ? '🔥 Grail' : card.priority.toUpperCase()}</span>`
        : `<span style="font-weight: 600; color: #cbd5e1;">${escapeHtml(card.card_condition || 'NM')}</span>`;

      const cardThumb = card.image_url
        ? `<img src="${escapeHtml(card.image_url)}" class="table-card-thumb" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.outerHTML='<div class=\\'no-thumb-placeholder\\'><i class=\\'ri-vip-diamond-line\\'></i></div>'">`
        : `<div class="no-thumb-placeholder"><i class="ri-vip-diamond-line"></i></div>`;

      const sourceBadge = card.price_source ? `<span class="source-tag">${escapeHtml(card.price_source)}</span>` : '';
      const jpyTag = card.jpy_price > 0 ? `<div style="font-size: 10px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace;">¥${card.jpy_price.toLocaleString()}</div>` : '';

      tr.innerHTML = `
        <td class="col-fav">
          <button class="btn-fav ${card.is_favorite ? 'active' : ''}" title="${card.is_favorite ? 'Remove Favorite' : 'Add to Favorite'}" onclick="window.joynessHobby.toggleTcgCardFavorite(${card.id}, ${card.is_favorite})">
            <i class="${card.is_favorite ? 'ri-star-fill' : 'ri-star-line'}"></i>
          </button>
        </td>
        <td class="col-no">${index + 1}</td>
        <td>${cardThumb}</td>
        <td>
          <div class="title-cell">
            <span class="title-text">${escapeHtml(card.name)}</span>
            ${card.notes ? `<span class="title-note" title="${escapeHtml(card.notes)}">${escapeHtml(card.notes)}</span>` : ''}
          </div>
        </td>
        <td>
          <span class="game-badge ${gameClass}">
            ${card.game.toLowerCase() === 'gundam' ? '🤖 ' : ''}${escapeHtml(card.game)}
          </span>
        </td>
        <td>
          <div style="font-size: 13px;">${escapeHtml(card.set_name || '—')}</div>
          <div style="font-size: 11px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace;">${escapeHtml(card.card_number || '')}</div>
        </td>
        <td>
          <span style="font-size: 12px; color: #c084fc; font-weight: 600;">${escapeHtml(card.rarity || '—')}</span>
        </td>
        <td>${conditionOrPriorityHtml}</td>
        <td>
          <div style="display: flex; flex-direction: column;">
            <span class="price-tag">${card.price_est > 0 ? `$${card.price_est.toFixed(2)}` : '—'}</span>
            ${jpyTag}
            ${sourceBadge}
          </div>
        </td>
        <td>${statusMarkup}</td>
        <td class="col-actions">
          <div class="row-actions">
            <button class="btn-icon-action" title="Edit" onclick="window.joynessHobby.openEditTcgCardModal(${card.id})">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn-icon-action delete" title="Delete" onclick="window.joynessHobby.promptDelete('tcg_card', ${card.id}, '${escapeHtml(card.name)}')">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      `;
      tcgCardsTableBody.appendChild(tr);
    });
  }

  async function handleTcgCardFormSubmit(e) {
    e.preventDefault();
    const id = formTcgCardId.value;
    const cardType = formTcgCardType.value;

    const payload = {
      card_type: cardType,
      game: formTcgGame.value,
      name: formTcgName.value.trim(),
      set_name: formTcgSet.value.trim(),
      card_number: formTcgNumber.value.trim(),
      rarity: formTcgRarity.value.trim(),
      card_condition: formTcgCondition.value,
      price_est: parseFloat(formTcgPrice.value) || 0.0,
      quantity: parseInt(formTcgQty.value) || 1,
      priority: formTcgPriority.value,
      status: cardType === 'hunting' ? formTcgStatus.value : 'owned',
      image_url: formTcgImageUrl.value.trim(),
      notes: formTcgNotes.value.trim(),
      is_favorite: formTcgIsFavorite.checked ? 1 : 0
    };

    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        if (id) {
          await window.JoynessFirestore.updateTcgCard(currentUser.uid, id, payload);
        } else {
          await window.JoynessFirestore.addTcgCard(currentUser.uid, payload);
        }
        closeTcgCardModal();
        showToast(id ? 'Card updated!' : 'Card added to vault!', 'success');
        loadTcgStats();
        loadTcgContent();
        return;
      }

      if (isStaticHost() && window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateTcgCard(id, payload);
        } else {
          window.JoynessGuestStore.addTcgCard(payload);
        }
        closeTcgCardModal();
        showToast(id ? 'Card updated!' : 'Card added to vault!', 'success');
        loadTcgStats();
        loadTcgContent();
        return;
      }

      const url = id ? `/api/tcg/cards/${id}` : '/api/tcg/cards';
      const method = id ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          closeTcgCardModal();
          showToast(id ? 'Card updated!' : 'Card added to vault!', 'success');
          loadTcgStats();
          loadTcgContent();
          return;
        }
      }

      if (window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateTcgCard(id, payload);
        } else {
          window.JoynessGuestStore.addTcgCard(payload);
        }
        closeTcgCardModal();
        showToast(id ? 'Card updated!' : 'Card added to vault!', 'success');
        loadTcgStats();
        loadTcgContent();
        return;
      }
    } catch (err) {
      if (window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateTcgCard(id, payload);
        } else {
          window.JoynessGuestStore.addTcgCard(payload);
        }
        closeTcgCardModal();
        showToast(id ? 'Card updated!' : 'Card added to vault!', 'success');
        loadTcgStats();
        loadTcgContent();
        return;
      }
      console.error(err);
      showToast('Error saving card', 'error');
    }
  }

  // ==========================================================================
  // DECK BUILDER TABLE LOGIC (LIST & TABLE DECKBUILDER)
  // ==========================================================================
  const CARD_CATEGORIES = [
    'Pokemon', 'Leader', 'Character', 'Mobile Suit', 'Pilot',
    'Event', 'Item', 'Supporter', 'Energy', 'Command', 'Support',
    'Warship', 'Monster', 'Spell', 'Trap', 'Other'
  ];

  function bindDeckBuilderEvents() {
    btnOpenAddDeckModal.addEventListener('click', openAddTcgDeckModal);
    btnTcgCloseDeckModal.addEventListener('click', closeTcgDeckModal);
    btnTcgCancelDeckModal.addEventListener('click', closeTcgDeckModal);
    tcgDeckModal.addEventListener('click', (e) => {
      if (e.target === tcgDeckModal) closeTcgDeckModal();
    });

    btnAddDeckCardRow.addEventListener('click', () => {
      addDeckCardRow('', 1, getDefaultCategoryForGame(formDeckGame.value));
    });

    // Quick Paste Toggle
    btnTogglePasteMode.addEventListener('click', () => {
      deckQuickPasteBox.classList.toggle('hidden');
      if (!deckQuickPasteBox.classList.contains('hidden')) {
        deckPasteTextarea.focus();
      }
    });

    btnCancelPaste.addEventListener('click', () => {
      deckQuickPasteBox.classList.add('hidden');
    });

    btnApplyPaste.addEventListener('click', () => {
      const text = deckPasteTextarea.value.trim();
      if (!text) return;
      const parsed = parseDeckTextToCards(text, formDeckGame.value);
      if (parsed.length > 0) {
        parsed.forEach(c => addDeckCardRow(c.name, c.qty, c.category));
        deckPasteTextarea.value = '';
        deckQuickPasteBox.classList.add('hidden');
        updateDeckBuilderCardCount();
        showToast(`Added ${parsed.length} cards from paste!`, 'success');
      }
    });

    tcgDeckForm.addEventListener('submit', handleTcgDeckFormSubmit);
  }

  function getDefaultCategoryForGame(game) {
    const g = (game || '').toLowerCase();
    if (g.includes('pokemon')) return 'Pokemon';
    if (g.includes('one piece')) return 'Character';
    if (g.includes('gundam')) return 'Mobile Suit';
    if (g.includes('yu-gi-oh')) return 'Monster';
    return 'Other';
  }

  function createCategoryOptions(selectedCat) {
    return CARD_CATEGORIES.map(cat => 
      `<option value="${cat}" ${cat.toLowerCase() === (selectedCat || '').toLowerCase() ? 'selected' : ''}>${cat}</option>`
    ).join('');
  }

  function addDeckCardRow(name = '', qty = 1, category = '') {
    const tr = document.createElement('tr');
    tr.className = 'deck-builder-row';
    const cat = category || getDefaultCategoryForGame(formDeckGame.value);

    tr.innerHTML = `
      <td>
        <input type="number" min="1" max="60" value="${qty}" class="deck-row-qty" oninput="window.joynessHobby.updateDeckCount()">
      </td>
      <td>
        <input type="text" value="${escapeHtml(name)}" class="deck-row-name" placeholder="Card Name..." oninput="window.joynessHobby.updateDeckCount()">
      </td>
      <td>
        <select class="deck-row-cat custom-select">
          ${createCategoryOptions(cat)}
        </select>
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-icon-action delete" title="Remove" onclick="this.closest('tr').remove(); window.joynessHobby.updateDeckCount();">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    `;

    deckBuilderTableBody.appendChild(tr);
    updateDeckBuilderCardCount();
  }

  function updateDeckBuilderCardCount() {
    const rows = deckBuilderTableBody.querySelectorAll('.deck-builder-row');
    let total = 0;
    rows.forEach(r => {
      const q = parseInt(r.querySelector('.deck-row-qty').value) || 0;
      total += q;
    });

    const targetCount = parseInt(formDeckCardCount.value) || 60;
    deckBuilderCountPill.textContent = `${total} / ${targetCount} Cards`;
    if (total === targetCount) {
      deckBuilderCountPill.style.color = '#34d399';
      deckBuilderCountPill.style.borderColor = 'rgba(52, 211, 153, 0.4)';
    } else {
      deckBuilderCountPill.style.color = '#38bdf8';
      deckBuilderCountPill.style.borderColor = 'rgba(56, 189, 248, 0.35)';
    }
  }

  function parseDeckTextToCards(text, game) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const defaultCat = getDefaultCategoryForGame(game);
    const results = [];

    lines.forEach(line => {
      let qty = 1;
      let name = line;
      let cat = defaultCat;

      const match = line.match(/^(\d+)[\s*x\-]+(.+)$/i);
      if (match) {
        qty = parseInt(match[1]) || 1;
        name = match[2].trim();
      }

      const lower = name.toLowerCase();
      if (lower.includes('energy')) cat = 'Energy';
      else if (lower.includes('candy') || lower.includes('ball') || lower.includes('catcher') || lower.includes('poffin')) cat = 'Item';
      else if (lower.includes('arven') || lower.includes('iono') || lower.includes('boss') || lower.includes('research')) cat = 'Supporter';
      else if (lower.includes('pilot') || lower.includes('amuro') || lower.includes('suletta')) cat = 'Pilot';
      else if (lower.includes('beam') || lower.includes('command') || lower.includes('shield')) cat = 'Command';

      results.push({ name, qty, category: cat });
    });

    return results;
  }

  function getDeckListFromTable() {
    const rows = deckBuilderTableBody.querySelectorAll('.deck-builder-row');
    const cards = [];
    rows.forEach(r => {
      const name = r.querySelector('.deck-row-name').value.trim();
      if (!name) return;
      const qty = parseInt(r.querySelector('.deck-row-qty').value) || 1;
      const category = r.querySelector('.deck-row-cat').value;
      cards.push({ name, qty, category });
    });
    return cards;
  }

  function parseDeckListRaw(rawList, game) {
    if (!rawList) return [];
    if (Array.isArray(rawList)) return rawList;
    try {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // It was string format, parse lines
      return parseDeckTextToCards(rawList, game);
    }
    return [];
  }

  function openAddTcgDeckModal() {
    formTcgDeckId.value = '';
    tcgDeckForm.reset();
    formDeckGame.value = (state.tcg.game !== 'all') ? state.tcg.game : 'Gundam';
    formDeckFormat.value = 'Standard';
    formDeckStatus.value = 'active';
    formDeckCardCount.value = formDeckGame.value.toLowerCase().includes('one piece') ? 50 : 60;
    formDeckImageUrl.value = '';

    deckBuilderTableBody.innerHTML = '';
    deckQuickPasteBox.classList.add('hidden');

    // Add 4 sample starting rows
    const defCat = getDefaultCategoryForGame(formDeckGame.value);
    addDeckCardRow('', 4, defCat);
    addDeckCardRow('', 4, defCat);

    tcgDeckModalTitle.innerHTML = '<i class="ri-stack-fill"></i> New Decklist Builder';
    tcgDeckModal.classList.remove('hidden');
    formDeckName.focus();
  }

  function closeTcgDeckModal() {
    tcgDeckModal.classList.add('hidden');
  }

  async function handleTcgDeckFormSubmit(e) {
    e.preventDefault();
    const id = formTcgDeckId.value;
    const cards = getDeckListFromTable();

    const payload = {
      deck_name: formDeckName.value.trim(),
      game: formDeckGame.value,
      format: formDeckFormat.value.trim(),
      status: formDeckStatus.value,
      card_count: parseInt(formDeckCardCount.value) || 60,
      leader_card: formDeckLeader.value.trim(),
      deck_list: cards, // stored as structured list
      image_url: formDeckImageUrl.value.trim(),
      notes: formDeckNotes.value.trim()
    };

    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        if (id) {
          await window.JoynessFirestore.updateTcgDeck(currentUser.uid, id, payload);
        } else {
          await window.JoynessFirestore.addTcgDeck(currentUser.uid, payload);
        }
        closeTcgDeckModal();
        showToast(id ? 'Decklist updated!' : 'Deck created successfully!', 'success');
        loadTcgStats();
        loadTcgDecks();
        return;
      }

      if (isStaticHost() && window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateTcgDeck(id, payload);
        } else {
          window.JoynessGuestStore.addTcgDeck(payload);
        }
        closeTcgDeckModal();
        showToast(id ? 'Decklist updated!' : 'Deck created successfully!', 'success');
        loadTcgStats();
        loadTcgDecks();
        return;
      }

      const url = id ? `/api/tcg/decks/${id}` : '/api/tcg/decks';
      const method = id ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          closeTcgDeckModal();
          showToast(id ? 'Decklist updated!' : 'Deck created successfully!', 'success');
          loadTcgStats();
          loadTcgDecks();
          return;
        }
      }

      if (window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateTcgDeck(id, payload);
        } else {
          window.JoynessGuestStore.addTcgDeck(payload);
        }
        closeTcgDeckModal();
        showToast(id ? 'Decklist updated!' : 'Deck created successfully!', 'success');
        loadTcgStats();
        loadTcgDecks();
        return;
      }
    } catch (err) {
      if (window.JoynessGuestStore) {
        if (id) {
          window.JoynessGuestStore.updateTcgDeck(id, payload);
        } else {
          window.JoynessGuestStore.addTcgDeck(payload);
        }
        closeTcgDeckModal();
        showToast(id ? 'Decklist updated!' : 'Deck created successfully!', 'success');
        loadTcgStats();
        loadTcgDecks();
        return;
      }
      console.error(err);
      showToast('Error saving deck', 'error');
    }
  }

  async function loadTcgDecks() {
    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        const data = await window.JoynessFirestore.getTcgDecks(currentUser.uid, {
          game: state.tcg.game,
          search: state.tcg.search
        });
        if (data.success) {
          state.tcg.decks = data.decks;
          renderTcgDecks();
          return;
        }
      }

      if (isStaticHost() && window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgDecks({
          game: state.tcg.game,
          search: state.tcg.search
        });
        if (data.success) {
          state.tcg.decks = data.decks;
          renderTcgDecks();
          return;
        }
      }

      const params = new URLSearchParams();
      if (state.tcg.game !== 'all') {
        params.append('game', state.tcg.game);
      }
      if (state.tcg.search) {
        params.append('search', state.tcg.search);
      }

      const res = await apiFetch(`/api/tcg/decks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          state.tcg.decks = data.decks;
          renderTcgDecks();
          return;
        }
      }

      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgDecks({
          game: state.tcg.game,
          search: state.tcg.search
        });
        if (data.success) {
          state.tcg.decks = data.decks;
          renderTcgDecks();
          return;
        }
      }
    } catch (err) {
      if (window.JoynessGuestStore) {
        const data = window.JoynessGuestStore.getTcgDecks({
          game: state.tcg.game,
          search: state.tcg.search
        });
        if (data.success) {
          state.tcg.decks = data.decks;
          renderTcgDecks();
          return;
        }
      }
      console.error(err);
      showToast('Failed to load decks', 'error');
    }
  }

  function renderTcgDecks() {
    const decks = state.tcg.decks;
    tcgVisibleCountBadge.textContent = `${decks.length} decks`;

    if (decks.length === 0) {
      tcgDecksViewWrapper.innerHTML = '';
      tcgEmptyState.classList.remove('hidden');
      return;
    }

    tcgEmptyState.classList.add('hidden');
    tcgDecksViewWrapper.innerHTML = '';

    decks.forEach(deck => {
      const card = document.createElement('div');
      card.className = 'card-item';
      const gameClass = deck.game.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const statuses = {
        active: { label: 'Active', color: '#34d399' },
        building: { label: 'In Progress', color: '#38bdf8' },
        testing: { label: 'Testing', color: '#fbbf24' },
        retired: { label: 'Retired', color: '#94a3b8' }
      };
      const st = statuses[deck.status] || statuses.active;

      const cardsList = parseDeckListRaw(deck.deck_list, deck.game);
      let deckTableRows = '';
      let totalCount = 0;

      if (cardsList.length > 0) {
        cardsList.forEach(c => {
          totalCount += (c.qty || 1);
          deckTableRows += `
            <tr>
              <td style="width: 44px;"><span class="deck-qty-badge">${c.qty || 1}x</span></td>
              <td style="font-weight: 600; color: #f8fafc;">${escapeHtml(c.name)}</td>
              <td style="width: 90px; text-align: right;"><span class="deck-cat-badge">${escapeHtml(c.category || 'Card')}</span></td>
            </tr>
          `;
        });
      } else {
        deckTableRows = `<tr><td colspan="3" style="text-align: center; color: var(--text-dim); padding: 12px;">No cards added yet</td></tr>`;
      }

      card.innerHTML = `
        <div>
          ${deck.image_url ? `<img src="${escapeHtml(deck.image_url)}" class="card-poster-hero" alt="${escapeHtml(deck.deck_name)}" style="height: 120px;" loading="lazy">` : ''}

          <div class="deck-header">
            <div>
              <span class="game-badge ${gameClass}">
                ${deck.game.toLowerCase() === 'gundam' ? '🤖 ' : ''}${escapeHtml(deck.game)}
              </span>
              <span style="font-size: 11px; margin-left: 6px; color: var(--text-dim);">${escapeHtml(deck.format)}</span>
            </div>
            <span style="font-size: 11px; font-weight: 700; color: ${st.color};">${st.label}</span>
          </div>

          <h3 class="deck-title">${escapeHtml(deck.deck_name)}</h3>

          ${deck.leader_card ? `
            <div class="deck-leader-box">
              <div class="lbl">Leader / Key Ace:</div>
              <div class="val">${escapeHtml(deck.leader_card)}</div>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Deck Card List Table:
            </span>
            <span class="deck-count-pill" style="font-size: 10px; padding: 1px 7px;">
              ${totalCount} / ${deck.card_count} Cards
            </span>
          </div>

          <!-- Structured Decklist Table Display -->
          <div class="deck-display-table-wrapper">
            <table class="deck-display-table">
              <thead>
                <tr>
                  <th style="width: 44px;">Qty</th>
                  <th>Card Name</th>
                  <th style="width: 90px; text-align: right;">Type</th>
                </tr>
              </thead>
              <tbody>
                ${deckTableRows}
              </tbody>
            </table>
          </div>

          ${deck.notes ? `<p style="font-size: 12px; color: var(--text-muted); line-height: 1.4; margin-bottom: 10px;">${escapeHtml(deck.notes)}</p>` : ''}
        </div>

        <div class="card-footer">
          <span style="font-size: 11px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace;">
            Total: ${totalCount} cards
          </span>
          <div class="row-actions">
            <button class="btn-icon-action" title="Edit deck" onclick="window.joynessHobby.openEditTcgDeckModal(${deck.id})">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn-icon-action delete" title="Delete deck" onclick="window.joynessHobby.promptDelete('tcg_deck', ${deck.id}, '${escapeHtml(deck.deck_name)}')">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </div>
      `;
      tcgDecksViewWrapper.appendChild(card);
    });
  }

  // ==========================================================================
  // DELETION CONFIRMATION
  // ==========================================================================
  function bindDeleteModalEvents() {
    btnCancelDelete.addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
    btnConfirmDelete.addEventListener('click', executeDelete);
  }

  function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    state.deleteTarget = null;
  }

  async function executeDelete() {
    const target = state.deleteTarget;
    if (!target) return;

    try {
      if (isFirestoreActive()) {
        const currentUser = window.JoynessAuth.getCurrentUser();
        if (target.type === 'watchlist') {
          await window.JoynessFirestore.deleteWatchlistItem(currentUser.uid, target.id);
        } else if (target.type === 'tcg_card') {
          await window.JoynessFirestore.deleteTcgCard(currentUser.uid, target.id);
        } else if (target.type === 'tcg_deck') {
          await window.JoynessFirestore.deleteTcgDeck(currentUser.uid, target.id);
        }
        showToast('Item deleted successfully', 'success');
        closeDeleteModal();
        if (target.type === 'watchlist') {
          loadWatchlistStats();
          loadWatchlistItems();
        } else {
          loadTcgStats();
          loadTcgContent();
        }
        return;
      }

      if (isStaticHost() && window.JoynessGuestStore) {
        if (target.type === 'watchlist') {
          window.JoynessGuestStore.deleteWatchlistItem(target.id);
        } else if (target.type === 'tcg_card') {
          window.JoynessGuestStore.deleteTcgCard(target.id);
        } else if (target.type === 'tcg_deck') {
          window.JoynessGuestStore.deleteTcgDeck(target.id);
        }
        showToast('Item deleted successfully', 'success');
        closeDeleteModal();
        if (target.type === 'watchlist') {
          loadWatchlistStats();
          loadWatchlistItems();
        } else {
          loadTcgStats();
          loadTcgContent();
        }
        return;
      }

      let url = '';
      if (target.type === 'watchlist') url = `/api/items/${target.id}`;
      else if (target.type === 'tcg_card') url = `/api/tcg/cards/${target.id}`;
      else if (target.type === 'tcg_deck') url = `/api/tcg/decks/${target.id}`;

      const res = await apiFetch(url, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast('Item deleted successfully', 'success');
          closeDeleteModal();
          if (target.type === 'watchlist') {
            loadWatchlistStats();
            loadWatchlistItems();
          } else {
            loadTcgStats();
            loadTcgContent();
          }
          return;
        }
      }

      if (window.JoynessGuestStore) {
        if (target.type === 'watchlist') {
          window.JoynessGuestStore.deleteWatchlistItem(target.id);
        } else if (target.type === 'tcg_card') {
          window.JoynessGuestStore.deleteTcgCard(target.id);
        } else if (target.type === 'tcg_deck') {
          window.JoynessGuestStore.deleteTcgDeck(target.id);
        }
        showToast('Item deleted successfully', 'success');
        closeDeleteModal();
        if (target.type === 'watchlist') {
          loadWatchlistStats();
          loadWatchlistItems();
        } else {
          loadTcgStats();
          loadTcgContent();
        }
        return;
      }
    } catch (err) {
      if (window.JoynessGuestStore) {
        if (target.type === 'watchlist') {
          window.JoynessGuestStore.deleteWatchlistItem(target.id);
        } else if (target.type === 'tcg_card') {
          window.JoynessGuestStore.deleteTcgCard(target.id);
        } else if (target.type === 'tcg_deck') {
          window.JoynessGuestStore.deleteTcgDeck(target.id);
        }
        showToast('Item deleted successfully', 'success');
        closeDeleteModal();
        if (target.type === 'watchlist') {
          loadWatchlistStats();
          loadWatchlistItems();
        } else {
          loadTcgStats();
          loadTcgContent();
        }
        return;
      }
      console.error(err);
      showToast('Error deleting item', 'error');
    }
  }

  // ==========================================================================
  // AUTHENTICATION & MULTI-USER LOGIC
  // ==========================================================================
  function bindAuthEvents() {
    // Open auth modal
    if (btnOpenAuthModal) {
      btnOpenAuthModal.addEventListener('click', () => openAuthModal('login'));
    }

    if (btnCloseAuthModal) {
      btnCloseAuthModal.addEventListener('click', closeAuthModal);
    }
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
      });
    }

    // Switch Sign In / Register tabs
    if (tabAuthLogin) {
      tabAuthLogin.addEventListener('click', () => setAuthMode('login'));
    }
    if (tabAuthRegister) {
      tabAuthRegister.addEventListener('click', () => setAuthMode('register'));
    }

    // Password visibility toggle
    if (btnTogglePassword) {
      btnTogglePassword.addEventListener('click', () => {
        const isPw = authPassword.type === 'password';
        authPassword.type = isPw ? 'text' : 'password';
        if (authConfirmPassword) {
          authConfirmPassword.type = isPw ? 'text' : 'password';
        }
        iconEyePw.className = isPw ? 'ri-eye-off-line' : 'ri-eye-line';
      });
    }

    // Auth Form Submit
    if (authForm) {
      authForm.addEventListener('submit', handleAuthFormSubmit);
    }

    // Social & Demo buttons
    if (btnAuthGoogle) {
      btnAuthGoogle.addEventListener('click', handleGoogleLogin);
    }
    if (btnAuthDemoGuest) {
      btnAuthDemoGuest.addEventListener('click', handleDemoGuestLogin);
    }

    // User dropdown toggle
    if (btnUserDropdownToggle) {
      btnUserDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        userAccountDropdown.classList.toggle('hidden');
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (userAccountDropdown && !userAccountDropdown.contains(e.target) && e.target !== btnUserDropdownToggle) {
        userAccountDropdown.classList.add('hidden');
      }
    });

    // Logout
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        if (window.JoynessAuth) {
          await window.JoynessAuth.logout();
        }
        userAccountDropdown.classList.add('hidden');
        showToast('Signed out successfully.', 'info');
      });
    }

    // Clone starter data to current user account
    if (btnCloneStarterData) {
      btnCloneStarterData.addEventListener('click', async () => {
        userAccountDropdown.classList.add('hidden');
        showToast('Loading starter cards and watchlist...', 'info');
        try {
          const res = await apiFetch('/api/user/clone_starter_pack', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message || 'Starter library added!', 'success');
            reloadAllData();
          } else {
            showToast(data.error || 'Failed to load starter pack', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Error loading starter pack', 'error');
        }
      });
    }
  }

  function updateAuthUI(user) {
    if (user) {
      // Desktop Header
      if (authLoggedOutView) authLoggedOutView.classList.add('hidden');
      if (authLoggedInView) authLoggedInView.classList.remove('hidden');

      const emailStr = user.email || 'user@joyness.com';
      const nameStr = user.displayName || emailStr.split('@')[0];
      const initial = nameStr.charAt(0).toUpperCase();

      if (userAvatarBadge) userAvatarBadge.textContent = initial;
      if (userPillEmail) userPillEmail.textContent = emailStr;
      if (dropdownUserName) dropdownUserName.textContent = nameStr;
      if (dropdownUserEmail) dropdownUserEmail.textContent = emailStr;

      const providerBadge = user.provider === 'firebase'
        ? '<i class="ri-fire-fill" style="color: #f59e0b;"></i> Firebase Cloud'
        : '<i class="ri-shield-check-fill" style="color: #38bdf8;"></i> Protected Session';

      if (dropdownProviderChip) dropdownProviderChip.innerHTML = providerBadge;

      // Mobile Navigation Drawer Card
      if (mobileDrawerLoggedOutView) mobileDrawerLoggedOutView.classList.add('hidden');
      if (mobileDrawerLoggedInView) mobileDrawerLoggedInView.classList.remove('hidden');
      if (mobileDrawerAvatarBadge) mobileDrawerAvatarBadge.textContent = initial;
      if (mobileDrawerUserName) mobileDrawerUserName.textContent = nameStr;
      if (mobileDrawerUserEmail) mobileDrawerUserEmail.textContent = emailStr;
      if (mobileDrawerProviderChip) mobileDrawerProviderChip.innerHTML = providerBadge;
      if (mobileBtnLogout) mobileBtnLogout.classList.remove('hidden');
    } else {
      // Desktop Header
      if (authLoggedOutView) authLoggedOutView.classList.remove('hidden');
      if (authLoggedInView) authLoggedInView.classList.add('hidden');
      if (userAccountDropdown) {
        userAccountDropdown.classList.add('hidden');
      }

      // Mobile Navigation Drawer Card
      if (mobileDrawerLoggedOutView) mobileDrawerLoggedOutView.classList.remove('hidden');
      if (mobileDrawerLoggedInView) mobileDrawerLoggedInView.classList.add('hidden');
      if (mobileBtnLogout) mobileBtnLogout.classList.add('hidden');
    }
  }

  // ==========================================================================
  // MOBILE NAVIGATION DRAWER LOGIC
  // ==========================================================================
  function bindMobileDrawerEvents() {
    function openMobileDrawer() {
      if (mobileNavOverlay) mobileNavOverlay.classList.remove('hidden');
      if (mobileNavDrawer) mobileNavDrawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function closeMobileDrawer() {
      if (mobileNavOverlay) mobileNavOverlay.classList.add('hidden');
      if (mobileNavDrawer) mobileNavDrawer.classList.add('hidden');
      document.body.style.overflow = '';
    }

    if (btnMobileNavToggle) {
      btnMobileNavToggle.addEventListener('click', openMobileDrawer);
    }
    if (btnCloseMobileDrawer) {
      btnCloseMobileDrawer.addEventListener('click', closeMobileDrawer);
    }
    if (mobileNavOverlay) {
      mobileNavOverlay.addEventListener('click', closeMobileDrawer);
    }

    // Module Switcher in Mobile Drawer
    if (mobileModuleTabWatchlist) {
      mobileModuleTabWatchlist.addEventListener('click', () => {
        switchModule('watchlist');
        closeMobileDrawer();
      });
    }
    if (mobileModuleTabTcg) {
      mobileModuleTabTcg.addEventListener('click', () => {
        switchModule('tcg');
        closeMobileDrawer();
      });
    }

    // Quick Actions in Mobile Drawer
    if (btnMobileOpenAuth) {
      btnMobileOpenAuth.addEventListener('click', () => {
        closeMobileDrawer();
        openAuthModal('login');
      });
    }
    if (mobileBtnAddWatchlist) {
      mobileBtnAddWatchlist.addEventListener('click', () => {
        closeMobileDrawer();
        if (state.activeModule !== 'watchlist') switchModule('watchlist');
        openAddWatchlistModal();
      });
    }
    if (mobileBtnAddCard) {
      mobileBtnAddCard.addEventListener('click', () => {
        closeMobileDrawer();
        if (state.activeModule !== 'tcg') switchModule('tcg');
        openAddTcgCardModal();
      });
    }
    if (mobileBtnAddDeck) {
      mobileBtnAddDeck.addEventListener('click', () => {
        closeMobileDrawer();
        if (state.activeModule !== 'tcg') switchModule('tcg');
        const deckTab = document.querySelector('#tcgSubtabs .subtab-btn[data-tcg-subtab="decks"]');
        if (deckTab) deckTab.click();
        openAddTcgDeckModal();
      });
    }
    if (mobileBtnSyncPrices) {
      mobileBtnSyncPrices.addEventListener('click', () => {
        closeMobileDrawer();
        handleSyncAllMarketPrices();
      });
    }
    if (mobileBtnExportCsv) {
      mobileBtnExportCsv.addEventListener('click', () => {
        closeMobileDrawer();
        if (isFirestoreActive()) {
          exportFirestoreWatchlistCsv();
          return;
        }
        const currentUser = window.JoynessAuth ? window.JoynessAuth.getCurrentUser() : null;
        const uid = currentUser && currentUser.uid ? currentUser.uid : 'default';
        window.location.href = `/api/export/csv?user_id=${encodeURIComponent(uid)}`;
        showToast('Exporting watchlist CSV...', 'success');
      });
    }
    if (mobileBtnCloneStarter) {
      mobileBtnCloneStarter.addEventListener('click', async () => {
        closeMobileDrawer();
        showToast('Loading starter cards and watchlist...', 'info');
        try {
          const res = await apiFetch('/api/user/clone_starter_pack', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message || 'Starter library added!', 'success');
            reloadAllData();
          } else {
            showToast(data.error || 'Failed to load starter pack', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Error loading starter pack', 'error');
        }
      });
    }
    if (mobileBtnFirebaseGuide) {
      mobileBtnFirebaseGuide.addEventListener('click', () => {
        closeMobileDrawer();
        if (firebaseGuideModal) firebaseGuideModal.classList.remove('hidden');
      });
    }
    if (mobileBtnLogout) {
      mobileBtnLogout.addEventListener('click', async () => {
        closeMobileDrawer();
        if (window.JoynessAuth) await window.JoynessAuth.logout();
        showToast('Signed out successfully.', 'info');
      });
    }
  }

  function openAuthModal(mode = 'login') {
    setAuthMode(mode);
    authForm.reset();
    authErrorAlert.classList.add('hidden');
    authSuccessAlert.classList.add('hidden');
    authModal.classList.remove('hidden');
    authEmail.focus();
  }

  function closeAuthModal() {
    authModal.classList.add('hidden');
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    authErrorAlert.classList.add('hidden');
    authSuccessAlert.classList.add('hidden');

    if (mode === 'register') {
      tabAuthRegister.classList.add('active');
      tabAuthLogin.classList.remove('active');
      groupDisplayName.classList.remove('hidden');
      groupConfirmPassword.classList.remove('hidden');
      authConfirmPassword.required = true;
      authSubmitText.textContent = 'Create Free Account';
      authModalTitle.textContent = 'Join JOYNESSHOBY';
    } else {
      tabAuthLogin.classList.add('active');
      tabAuthRegister.classList.remove('active');
      groupDisplayName.classList.add('hidden');
      groupConfirmPassword.classList.add('hidden');
      authConfirmPassword.required = false;
      authSubmitText.textContent = 'Sign In to My Vault';
      authModalTitle.textContent = 'Welcome to JOYNESSHOBY';
    }
  }

  async function handleAuthFormSubmit(e) {
    e.preventDefault();
    authErrorAlert.classList.add('hidden');
    authSuccessAlert.classList.add('hidden');

    const email = authEmail.value.trim();
    const password = authPassword.value;
    const rememberMe = authRememberMe.checked;

    if (!window.JoynessAuth) {
      showToast('Authentication service unavailable', 'error');
      return;
    }

    try {
      if (state.authMode === 'register') {
        const confirmPw = authConfirmPassword.value;
        if (password !== confirmPw) {
          throw new Error('Passwords do not match. Please re-enter.');
        }
        const displayName = authDisplayName.value.trim();
        showToast('Creating account...', 'info');
        await window.JoynessAuth.signUp(email, password, displayName);
        showToast('Account created! Welcome to JOYNESSHOBY!', 'success');
        closeAuthModal();
      } else {
        showToast('Signing in...', 'info');
        await window.JoynessAuth.login(email, password, rememberMe);
        showToast('Signed in successfully!', 'success');
        closeAuthModal();
      }
    } catch (err) {
      authErrorMsg.textContent = err.message || 'Authentication error';
      authErrorAlert.classList.remove('hidden');
    }
  }

  async function handleGoogleLogin() {
    if (!window.JoynessAuth) return;
    try {
      showToast('Opening Google sign-in...', 'info');
      await window.JoynessAuth.loginWithGoogle();
      showToast('Signed in with Google!', 'success');
      closeAuthModal();
    } catch (err) {
      authErrorMsg.textContent = err.message || 'Google Sign-In failed';
      authErrorAlert.classList.remove('hidden');
    }
  }

  function handleDemoGuestLogin() {
    if (!window.JoynessAuth) return;
    window.JoynessAuth.loginDemoGuest();
    showToast('Signed in as Demo Guest! (Your data is saved locally)', 'success');
    closeAuthModal();
  }

  // ==========================================================================
  // FIREBASE GUIDE MODAL
  // ==========================================================================
  function bindFirebaseGuideEvents() {
    const inputApiKey = document.getElementById('inputFirebaseApiKey');
    const btnSaveApiKey = document.getElementById('btnSaveFirebaseApiKey');
    const badgeStatus = document.getElementById('apiKeyStatusBadge');
    const btnCloseGuide = document.getElementById('btnCloseFirebaseGuideBtn');
    const liveDot = document.getElementById('firebaseLiveDot');
    const liveStatusText = document.getElementById('firebaseLiveStatusText');

    // Populate existing key if available
    const existingKey = localStorage.getItem('joyness_firebase_api_key') || (typeof firebaseConfig !== 'undefined' ? firebaseConfig.apiKey : '');
    if (inputApiKey && existingKey && !existingKey.includes('PASTE_')) {
      inputApiKey.value = existingKey;
      if (badgeStatus) {
        badgeStatus.textContent = 'Active (Live Cloud Firebase)';
        badgeStatus.style.background = 'rgba(16, 185, 129, 0.15)';
        badgeStatus.style.color = '#34d399';
        badgeStatus.style.borderColor = 'rgba(52, 211, 153, 0.3)';
      }
      if (liveDot) liveDot.style.background = '#10b981';
      if (liveStatusText) liveStatusText.textContent = 'Connected: joyness-hoby (Live Firebase)';
    }

    if (btnSaveApiKey && inputApiKey) {
      btnSaveApiKey.addEventListener('click', () => {
        const key = inputApiKey.value.trim();
        if (!key) {
          showToast('Please enter your Firebase Web API key', 'info');
          return;
        }
        if (!key.startsWith('AIza')) {
          showToast('Notice: Firebase Web API keys usually start with "AIzaSy..."', 'info');
        }
        showToast('Saving API key & connecting to Firebase...', 'success');
        if (window.JoynessAuth) {
          window.JoynessAuth.saveApiKey(key);
        }
      });
    }

    if (btnCloseGuide) {
      btnCloseGuide.addEventListener('click', () => {
        if (firebaseGuideModal) firebaseGuideModal.classList.add('hidden');
      });
    }

    if (btnOpenFirebaseSetup) {
      btnOpenFirebaseSetup.addEventListener('click', () => {
        if (userAccountDropdown) userAccountDropdown.classList.add('hidden');
        firebaseGuideModal.classList.remove('hidden');
      });
    }

    if (btnOpenFirebaseGuideFromAuth) {
      btnOpenFirebaseGuideFromAuth.addEventListener('click', () => {
        closeAuthModal();
        firebaseGuideModal.classList.remove('hidden');
      });
    }

    if (btnCloseFirebaseGuideModal) {
      btnCloseFirebaseGuideModal.addEventListener('click', () => {
        firebaseGuideModal.classList.add('hidden');
      });
    }

    if (firebaseGuideModal) {
      firebaseGuideModal.addEventListener('click', (e) => {
        if (e.target === firebaseGuideModal) firebaseGuideModal.classList.add('hidden');
      });
    }
  }

  // ==========================================================================
  // AUTOMATIC IMAGE TALLYING & LIVE PRICE LOOKUP
  // ==========================================================================
  function bindAutoTallyEvents() {
    // 1. Watchlist Auto-Tallying
    let titleTallyDebounce;
    formTitle.addEventListener('input', (e) => {
      clearTimeout(titleTallyDebounce);
      const title = e.target.value.trim();
      if (!title) return;

      titleTallyDebounce = setTimeout(async () => {
        try {
          const cat = formCategory.value;
          let matchedUrl = '';
          try {
            const res = await apiFetch(`/api/resolve_image?query=${encodeURIComponent(title)}&type=watchlist&game=${encodeURIComponent(cat)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.image_url) matchedUrl = data.image_url;
            }
          } catch (_) {}

          if (!matchedUrl) {
            matchedUrl = await resolveImageClientSide(title, cat);
          }

          if (matchedUrl) {
            posterPreviewImg.src = matchedUrl;
            formImageUrl.value = matchedUrl;
            posterTallyTitle.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Cover auto-matched';
            posterTallySub.textContent = `Matched artwork for "${title}"`;
          }
        } catch (err) {
          console.error('Error auto-tallying watchlist poster:', err);
        }
      }, 350);
    });

    if (btnToggleCustomPoster) {
      btnToggleCustomPoster.addEventListener('click', () => {
        customPosterWrap.classList.toggle('hidden');
      });
    }

    formImageUrl.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        posterPreviewImg.src = url;
      }
    });

    // 2. TCG Card Auto-Tallying (Artwork + Collectr & Yuyu-tei Price)
    let cardTallyDebounce;
    formTcgName.addEventListener('input', (e) => {
      clearTimeout(cardTallyDebounce);
      const name = e.target.value.trim();
      if (!name) return;

      cardTallyDebounce = setTimeout(async () => {
        autoFetchCardArtworkAndMarket(name, false);
      }, 400);
    });

    if (btnAutoFetchCardData) {
      btnAutoFetchCardData.addEventListener('click', () => {
        const name = formTcgName.value.trim();
        if (!name) {
          showToast('Please enter a card name first', 'error');
          return;
        }
        autoFetchCardArtworkAndMarket(name, true);
      });
    }

    if (btnToggleCustomCardImage) {
      btnToggleCustomCardImage.addEventListener('click', () => {
        customCardImageWrap.classList.toggle('hidden');
      });
    }

    formTcgImageUrl.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        cardPreviewImg.src = url;
      }
    });
  }

  async function autoFetchCardArtworkAndMarket(name, forceNotification = false) {
    const game = formTcgGame.value;
    const cond = formTcgCondition.value;

    let c = null;
    try {
      const params = new URLSearchParams({
        name,
        game,
        condition: cond
      });

      const res = await apiFetch(`/api/tcg/auto_card_info?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.card) c = data.card;
      }
    } catch (_) {}

    if (!c) {
      c = resolveCardInfoClientSide(name, game);
    }

    if (c) {
      // Auto-tally image
      if (c.image_url) {
        cardPreviewImg.src = c.image_url;
        formTcgImageUrl.value = c.image_url;
        imageTallyTitle.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Artwork auto-matched';
        imageTallySub.textContent = `Matched artwork for "${name}"`;
      }

      // Auto-fetch price
      const priceUsd = c.price_usd !== undefined ? c.price_usd : (parseFloat(c.price_est) || 0);
      if (priceUsd > 0) {
        formTcgPrice.value = priceUsd.toFixed(2);
        cardPriceSourceChip.innerHTML = `<i class="ri-sparkling-fill"></i> Auto-priced from ${escapeHtml(c.source || 'Database')}`;
        if (c.price_jpy > 0) {
          cardPriceJpyHint.textContent = `(¥${c.price_jpy.toLocaleString()} JPY)`;
        } else {
          cardPriceJpyHint.textContent = '';
        }
      }

      // Populate set & number if currently empty
      if (!formTcgSet.value && c.set_name) {
        formTcgSet.value = c.set_name;
      }
      if (!formTcgNumber.value && c.card_number) {
        formTcgNumber.value = c.card_number;
      }
      if (!formTcgRarity.value && c.rarity) {
        formTcgRarity.value = c.rarity;
      }

      if (forceNotification) {
        showToast(`Auto-matched artwork and pricing for ${name}!`, 'success');
      }
    } else if (forceNotification) {
      showToast('Could not automatically price this card. Please enter manually.', 'info');
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  function formatWebsiteDisplay(website) {
    if (!website || !website.trim()) {
      return `<span class="no-website">—</span>`;
    }
    const clean = website.trim();
    let url = clean;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.')) {
        url = 'https://' + url;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(clean + ' stream')}`;
      }
    }

    let domain = clean.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
    if (domain.length > 18) domain = domain.substring(0, 16) + '...';

    return `
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="website-link" title="Open ${escapeHtml(url)}">
        <i class="ri-external-link-line"></i>
        <span>${escapeHtml(domain || 'Watch')}</span>
      </a>
    `;
  }

  function getStatusMarkup(status, itemId) {
    const statuses = {
      watching: { label: 'Watching', class: 'watching', icon: '<span class="dot"></span>' },
      marathon: { label: 'Marathon', class: 'marathon', icon: '<i class="ri-fire-fill"></i>' },
      hold: { label: 'On Hold', class: 'hold', icon: '<i class="ri-pause-line"></i>' },
      drop: { label: 'Dropped', class: 'drop', icon: '<i class="ri-close-line"></i>' },
      completed: { label: 'Completed', class: 'completed', icon: '<i class="ri-check-line"></i>' }
    };
    const s = statuses[status] || statuses.watching;

    return `
      <div class="status-pill ${s.class}" title="Click to cycle status" onclick="window.joynessHobby.cycleWatchlistStatus(${itemId}, '${status}')">
        ${s.icon}
        <span>${s.label}</span>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'ri-checkbox-circle-fill' : type === 'info' ? 'ri-information-fill' : 'ri-error-warning-fill';
    toast.innerHTML = `<i class="${icon}"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ==========================================================================
  // GLOBAL WINDOW EXPORTS (For Inline Event Handlers & Modal Triggers)
  // ==========================================================================
  window.joynessHobby = {
    updateDeckCount() {
      updateDeckBuilderCardCount();
    },

    async toggleFavorite(id, currentFav) {
      const nextFav = currentFav ? 0 : 1;
      try {
        if (isFirestoreActive()) {
          const currentUser = window.JoynessAuth.getCurrentUser();
          await window.JoynessFirestore.updateWatchlistItem(currentUser.uid, id, { is_favorite: nextFav });
          showToast(nextFav ? 'Added to Favorites ★' : 'Removed from Favorites', 'success');
          loadWatchlistStats();
          loadWatchlistItems();
          return;
        }

        if (isStaticHost() && window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { is_favorite: nextFav });
          showToast(nextFav ? 'Added to Favorites ★' : 'Removed from Favorites', 'success');
          loadWatchlistStats();
          loadWatchlistItems();
          return;
        }

        const res = await apiFetch(`/api/items/${id}/patch`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_favorite: nextFav })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            showToast(nextFav ? 'Added to Favorites ★' : 'Removed from Favorites', 'success');
            loadWatchlistStats();
            loadWatchlistItems();
            return;
          }
        }

        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { is_favorite: nextFav });
          showToast(nextFav ? 'Added to Favorites ★' : 'Removed from Favorites', 'success');
          loadWatchlistStats();
          loadWatchlistItems();
        }
      } catch (err) {
        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { is_favorite: nextFav });
          showToast(nextFav ? 'Added to Favorites ★' : 'Removed from Favorites', 'success');
          loadWatchlistStats();
          loadWatchlistItems();
        }
      }
    },

    async stepEpisode(id, currentEp, delta) {
      const newEp = Math.max(0, currentEp + delta);
      try {
        if (isFirestoreActive()) {
          const currentUser = window.JoynessAuth.getCurrentUser();
          await window.JoynessFirestore.updateWatchlistItem(currentUser.uid, id, { current_ep: newEp });
          loadWatchlistStats();
          loadWatchlistItems();
          return;
        }

        if (isStaticHost() && window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { current_ep: newEp });
          loadWatchlistStats();
          loadWatchlistItems();
          return;
        }

        const res = await apiFetch(`/api/items/${id}/patch`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_ep: newEp })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            loadWatchlistStats();
            loadWatchlistItems();
            return;
          }
        }

        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { current_ep: newEp });
          loadWatchlistStats();
          loadWatchlistItems();
        }
      } catch (err) {
        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { current_ep: newEp });
          loadWatchlistStats();
          loadWatchlistItems();
        }
      }
    },

    async cycleWatchlistStatus(id, currentStatus) {
      const sequence = ['watching', 'marathon', 'hold', 'drop', 'completed'];
      let nextIndex = (sequence.indexOf(currentStatus) + 1) % sequence.length;
      const nextStatus = sequence[nextIndex];

      try {
        if (isFirestoreActive()) {
          const currentUser = window.JoynessAuth.getCurrentUser();
          await window.JoynessFirestore.updateWatchlistItem(currentUser.uid, id, { status: nextStatus });
          showToast(`Status updated: ${nextStatus.toUpperCase()}`, 'success');
          loadWatchlistStats();
          loadWatchlistItems();
          return;
        }

        if (isStaticHost() && window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { status: nextStatus });
          showToast(`Status updated: ${nextStatus.toUpperCase()}`, 'success');
          loadWatchlistStats();
          loadWatchlistItems();
          return;
        }

        const res = await apiFetch(`/api/items/${id}/patch`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            showToast(`Status updated: ${nextStatus.toUpperCase()}`, 'success');
            loadWatchlistStats();
            loadWatchlistItems();
            return;
          }
        }

        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { status: nextStatus });
          showToast(`Status updated: ${nextStatus.toUpperCase()}`, 'success');
          loadWatchlistStats();
          loadWatchlistItems();
        }
      } catch (err) {
        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchWatchlistItem(id, { status: nextStatus });
          showToast(`Status updated: ${nextStatus.toUpperCase()}`, 'success');
          loadWatchlistStats();
          loadWatchlistItems();
        }
      }
    },

    openEditWatchlistModal(id) {
      const item = state.watchlist.items.find(i => String(i.id) === String(id));
      if (!item) return;

      formItemId.value = item.id;
      formTitle.value = item.title;
      formCategory.value = item.category;
      formStatus.value = item.status;
      formCurrentEp.value = item.current_ep;
      formTotalEp.value = item.total_ep;
      formRating.value = item.rating;
      formWebsite.value = item.website;
      formImageUrl.value = item.image_url || '';
      if (item.image_url) {
        posterPreviewImg.src = item.image_url;
        posterTallyTitle.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Cover loaded';
        posterTallySub.textContent = `Cover for "${item.title}"`;
      }
      formNotes.value = item.notes;
      formIsFavorite.checked = Boolean(item.is_favorite);

      modalTitle.innerHTML = '<i class="ri-edit-box-line"></i> Edit Title';
      itemModal.classList.remove('hidden');
      formTitle.focus();
    },

    async toggleTcgCardFavorite(id, currentFav) {
      const nextFav = currentFav ? 0 : 1;
      try {
        if (isFirestoreActive()) {
          const currentUser = window.JoynessAuth.getCurrentUser();
          await window.JoynessFirestore.updateTcgCard(currentUser.uid, id, { is_favorite: nextFav });
          showToast(nextFav ? 'Card starred as Favorite ★' : 'Removed from Favorites', 'success');
          loadTcgStats();
          loadTcgContent();
          return;
        }

        if (isStaticHost() && window.JoynessGuestStore) {
          window.JoynessGuestStore.patchTcgCard(id, { is_favorite: nextFav });
          showToast(nextFav ? 'Card starred as Favorite ★' : 'Removed from Favorites', 'success');
          loadTcgStats();
          loadTcgContent();
          return;
        }

        const res = await apiFetch(`/api/tcg/cards/${id}/patch`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_favorite: nextFav })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            showToast(nextFav ? 'Card starred as Favorite ★' : 'Removed from Favorites', 'success');
            loadTcgStats();
            loadTcgContent();
            return;
          }
        }

        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchTcgCard(id, { is_favorite: nextFav });
          showToast(nextFav ? 'Card starred as Favorite ★' : 'Removed from Favorites', 'success');
          loadTcgStats();
          loadTcgContent();
        }
      } catch (err) {
        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchTcgCard(id, { is_favorite: nextFav });
          showToast(nextFav ? 'Card starred as Favorite ★' : 'Removed from Favorites', 'success');
          loadTcgStats();
          loadTcgContent();
        }
      }
    },

    async cycleHuntStatus(id, currentStatus) {
      const sequence = ['hunting', 'found', 'ordered', 'trading'];
      let nextIndex = (sequence.indexOf(currentStatus) + 1) % sequence.length;
      const nextStatus = sequence[nextIndex];

      try {
        if (isFirestoreActive()) {
          const currentUser = window.JoynessAuth.getCurrentUser();
          await window.JoynessFirestore.updateTcgCard(currentUser.uid, id, { status: nextStatus });
          showToast(`Hunt Status: ${nextStatus.toUpperCase()}`, 'success');
          loadTcgStats();
          loadTcgContent();
          return;
        }

        if (isStaticHost() && window.JoynessGuestStore) {
          window.JoynessGuestStore.patchTcgCard(id, { status: nextStatus });
          showToast(`Hunt Status: ${nextStatus.toUpperCase()}`, 'success');
          loadTcgStats();
          loadTcgContent();
          return;
        }

        const res = await apiFetch(`/api/tcg/cards/${id}/patch`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            showToast(`Hunt Status: ${nextStatus.toUpperCase()}`, 'success');
            loadTcgStats();
            loadTcgContent();
            return;
          }
        }

        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchTcgCard(id, { status: nextStatus });
          showToast(`Hunt Status: ${nextStatus.toUpperCase()}`, 'success');
          loadTcgStats();
          loadTcgContent();
        }
      } catch (err) {
        if (window.JoynessGuestStore) {
          window.JoynessGuestStore.patchTcgCard(id, { status: nextStatus });
          showToast(`Hunt Status: ${nextStatus.toUpperCase()}`, 'success');
          loadTcgStats();
          loadTcgContent();
        }
      }
    },

    openEditTcgCardModal(id) {
      const card = state.tcg.cards.find(c => String(c.id) === String(id));
      if (!card) return;

      formTcgCardId.value = card.id;
      formTcgCardType.value = card.card_type;
      toggleCardFormFields(card.card_type);
      formTcgGame.value = card.game;
      formTcgName.value = card.name;
      formTcgSet.value = card.set_name;
      formTcgNumber.value = card.card_number;
      formTcgRarity.value = card.rarity;
      formTcgCondition.value = card.card_condition;
      formTcgPrice.value = card.price_est;
      formTcgQty.value = card.quantity;
      formTcgPriority.value = card.priority;
      formTcgStatus.value = card.status;
      formTcgImageUrl.value = card.image_url || '';
      if (card.image_url) {
        cardPreviewImg.src = card.image_url;
        imageTallyTitle.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Artwork loaded';
        imageTallySub.textContent = `Artwork for "${card.name}"`;
      }
      cardPriceSourceChip.innerHTML = card.price_source ? `<i class="ri-sparkling-fill"></i> Price source: ${escapeHtml(card.price_source)}` : '<i class="ri-sparkling-fill"></i> Custom Price';
      cardPriceJpyHint.textContent = card.jpy_price > 0 ? `(¥${card.jpy_price.toLocaleString()} JPY)` : '';
      formTcgNotes.value = card.notes;
      formTcgIsFavorite.checked = Boolean(card.is_favorite);

      tcgCardModalTitle.innerHTML = '<i class="ri-edit-box-line"></i> Edit Card';
      tcgCardModal.classList.remove('hidden');
      formTcgName.focus();
    },

    openEditTcgDeckModal(id) {
      const deck = state.tcg.decks.find(d => String(d.id) === String(id));
      if (!deck) return;

      formTcgDeckId.value = deck.id;
      formDeckName.value = deck.deck_name;
      formDeckGame.value = deck.game;
      formDeckFormat.value = deck.format;
      formDeckStatus.value = deck.status;
      formDeckCardCount.value = deck.card_count;
      formDeckLeader.value = deck.leader_card;
      formDeckImageUrl.value = deck.image_url || '';
      formDeckNotes.value = deck.notes;

      // Populate Deck List Table Rows
      deckBuilderTableBody.innerHTML = '';
      deckQuickPasteBox.classList.add('hidden');
      const cards = parseDeckListRaw(deck.deck_list, deck.game);

      if (cards.length > 0) {
        cards.forEach(c => addDeckCardRow(c.name, c.qty, c.category));
      } else {
        addDeckCardRow('', 4, getDefaultCategoryForGame(deck.game));
      }

      tcgDeckModalTitle.innerHTML = '<i class="ri-edit-box-line"></i> Edit Deck List';
      tcgDeckModal.classList.remove('hidden');
      formDeckName.focus();
    },

    promptDelete(type, id, title) {
      state.deleteTarget = { type, id, name: title };
      deleteItemTitle.textContent = `"${title}"`;
      deleteModal.classList.remove('hidden');
    }
  };
});
