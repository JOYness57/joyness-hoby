# 🎮 JOYNESSHOBY &mdash; Watchlist Tracker & TCG Vault

A modern, responsive all-in-one hobby hub built with **Python (Flask)** and **Google Firebase (Authentication & Cloud Firestore)**.

Features a full-stack **Watchlist Tracker** (Anime, Movies, Series with episode counters & favorite stars) and **TCG Vault** (Gundam, One Piece, Pokémon, Yu-Gi-Oh! collection, hunting/grail chase lists, and interactive structured deck builder).

---

## 🌟 Key Features

### 1. 🎬 Watchlist Tracker (Anime / Movie / Series)
- **Sub-tab Filtering**: Filter instantly across All, Anime, Movie, Series, and Favorites.
- **Status Stepper & Episode Tracking**: Interactive +/- buttons with touch-friendly counters.
- **Auto Cover Art Resolution**: Type the title of any anime, movie, or series, and artwork tallies automatically.
- **Status Workflow**: `Watching`, `Marathon`, `On Hold`, `Dropped`, `Completed`.
- **CSV Import & Export**: One-click spreadsheet backup and export.

### 2. 🃏 TCG Vault & Deck Builder
- **Multi-Game Support**: Gundam, One Piece, Pokémon, Yu-Gi-Oh!, Magic The Gathering.
- **Collection vs. Hunting List**: Track owned binder cards with condition/value, or track high-priority grails and chase cards.
- **Automated Market Price Scraper**: Automatically queries real-time market data from **Collectr** and **Yuyu-tei** in USD ($) and Japanese Yen (¥).
- **Interactive Decklist Builder**: Build 50-60 card decks with card counts, structured table lists, and quick-paste support.

### 3. 🔐 Cloud Firebase Authentication & Firestore Database
- **Email/Password & Google Sign-In**: Instant registration, login, and profile avatars.
- **Cloud Firestore Database**: Multi-user isolation (`users/{uid}/watchlist`, `users/{uid}/tcg_cards`, `users/{uid}/tcg_decks`).
- **Starter Pack Auto-Seeding**: Automatically seeds rich initial collection (Gundam Aerial, Luffy Gear 5, Frieren, Dune, and starter decks) upon first login!
- **Local Fallback Engine**: Native SQLite + PBKDF2 hashing fallback for zero-config local testing.

### 4. 📱 Mobile & Desktop Responsive Design
- Glassmorphic slide-out navigation drawer on screens `<768px`.
- Minimum 44px touch targets across all buttons, dropdowns, and form inputs.
- Responsive grid and card views with zero horizontal scrolling.

---

## 🚀 Quick Start (Local Run)

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Start the application**:
   ```bash
   python app.py
   ```
   *(Or double-click `start.bat`)*
3. **Open in browser**:
   Navigate to [http://localhost:5000/](http://localhost:5000/)

---

## 📤 How to Upload to GitHub

### Method A: One-Click Script (Windows)
Double-click:
📁 **`upload_to_github.bat`**  
Follow the prompt to paste your GitHub repository URL &mdash; it stages, commits, and pushes automatically!

### Method B: Manual Git Commands
```bash
# 1. Initialize git
git init

# 2. Stage all files (respecting .gitignore)
git add .

# 3. Create your first commit
git commit -m "Initial commit: JOYNESSHOBY with Firebase Auth & Cloud Firestore"

# 4. Set branch to main
git branch -M main

# 5. Link your GitHub repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/joyness-hoby.git

# 6. Push to GitHub
git push -u origin main
```

---

## ☁️ 24/7 Cloud Deployment

### Option 1: Render.com (Full Python Flask Server &mdash; 24/7 Free)
1. Go to [https://render.com](https://render.com) and create a free account.
2. Click **"New +"** &rarr; **"Web Service"** &rarr; connect your GitHub repo.
3. Configuration:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: `Free`
4. Click **Create Web Service**. Your site will be online at `https://joyness-hoby.onrender.com`!

### Option 2: Firebase Hosting (Google CDN &mdash; 24/7 Free)
1. Log into your Google account:
   ```bash
   npx -y firebase-tools login
   ```
   *(Or double-click `login_firebase.bat`)*
2. Deploy to Firebase:
   ```bash
   npx -y firebase-tools deploy --only hosting
   ```
   *(Or double-click `deploy_firebase.bat`)*
3. Live URL: `https://joyness-hoby.web.app`

---

## 📄 License
MIT License &copy; 2026 JOYNESSHOBY
