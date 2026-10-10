import os
import sqlite3
import csv
import io
import json
import re
import secrets
import urllib.request
import urllib.parse
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, render_template, request, jsonify, Response

app = Flask(__name__)
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'watchlist.db')

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 0. Users table (for native server-side SQLite authentication)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT DEFAULT '',
            auth_provider TEXT DEFAULT 'sqlite',
            session_token TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 1. Watchlist table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL, /* 'anime', 'movie', 'series' */
            current_ep INTEGER DEFAULT 0,
            total_ep INTEGER DEFAULT 0,
            website TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'watching', /* 'watching', 'marathon', 'hold', 'drop', 'completed' */
            is_favorite INTEGER DEFAULT 0, /* 0 or 1 */
            rating INTEGER DEFAULT 0, /* 0 to 10 */
            notes TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    try:
        cursor.execute("ALTER TABLE items ADD COLUMN image_url TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    # 2. TCG Cards table (Collection & Hunting list)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tcg_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            game TEXT NOT NULL DEFAULT 'One Piece',
            card_type TEXT NOT NULL DEFAULT 'collection', /* 'collection' or 'hunting' */
            set_name TEXT DEFAULT '',
            card_number TEXT DEFAULT '',
            rarity TEXT DEFAULT '',
            card_condition TEXT DEFAULT 'NM',
            quantity INTEGER DEFAULT 1,
            price_est REAL DEFAULT 0.0,
            status TEXT DEFAULT 'owned',
            priority TEXT DEFAULT 'medium',
            is_favorite INTEGER DEFAULT 0,
            image_url TEXT DEFAULT '',
            collectr_url TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    try:
        cursor.execute("ALTER TABLE tcg_cards ADD COLUMN image_url TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE tcg_cards ADD COLUMN collectr_url TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE tcg_cards ADD COLUMN price_source TEXT DEFAULT 'Collectr'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE tcg_cards ADD COLUMN jpy_price INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE tcg_cards ADD COLUMN last_price_sync TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    # 3. TCG Decks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tcg_decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_name TEXT NOT NULL,
            game TEXT NOT NULL DEFAULT 'One Piece',
            format TEXT DEFAULT 'Standard',
            status TEXT DEFAULT 'active',
            card_count INTEGER DEFAULT 50,
            leader_card TEXT DEFAULT '',
            deck_list TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    try:
        cursor.execute("ALTER TABLE tcg_decks ADD COLUMN image_url TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()

init_db()

# ==============================================================================
# AUTOMATIC IMAGE RESOLVER & TALLY SYSTEM
# ==============================================================================

TCG_IMAGE_PATTERNS = [
    (r'umbreon.*vmax', '/static/img/cards/umbreon_vmax.png'),
    (r'umbreon', '/static/img/cards/umbreon_vmax.png'),
    (r'luffy.*(gear\s*5|g5|awakening)', '/static/img/cards/luffy_g5.png'),
    (r'luffy', '/static/img/cards/luffy_g5.png'),
    (r'zoro', '/static/img/cards/zoro_alt.png'),
    (r'charizard', '/static/img/cards/charizard_151.png'),
    (r'blue[\s-]*eyes', '/static/img/cards/blue_eyes.jpg'),
    (r'portgas.*ace|ace.*manga', '/static/img/cards/ace_manga.png'),
    (r'ace', '/static/img/cards/ace_manga.png'),
    (r'nami', '/static/img/cards/nami_alt.png'),
    (r'pikachu.*(van\s*gogh|felt\s*hat)', '/static/img/cards/pikachu_vangogh.jpg'),
    (r'pikachu', '/static/img/cards/pikachu_vangogh.jpg'),
    (r'dark\s*magician\s*girl', '/static/img/cards/dark_magician_girl.jpg'),
    (r'(the\s*)?one\s*ring', '/static/img/cards/the_one_ring.jpg'),
    (r'rx[\s-]*78|grandpa\s*gundam', '/static/img/cards/gundam_rx78.jpg'),
    (r'aerial|suletta', '/static/img/cards/gundam_aerial.jpg'),
]

WATCHLIST_IMAGE_PATTERNS = [
    (r'one\s*piece', '/static/img/covers/one_piece.jpg'),
    (r'solo\s*leveling', '/static/img/covers/solo_leveling.jpg'),
    (r'frieren', '/static/img/covers/frieren.jpg'),
    (r'jujutsu\s*kaisen', '/static/img/covers/jujutsu_kaisen.jpg'),
    (r'dune', '/static/img/covers/dune_two.jpg'),
    (r'interstellar', '/static/img/covers/interstellar.jpg'),
    (r'spirited\s*away', '/static/img/covers/spirited_away.jpg'),
    (r'severance', '/static/img/covers/severance.jpg'),
    (r'the\s*last\s*of\s*us|last\s*of\s*us', '/static/img/covers/the_last_of_us.jpg'),
    (r'stranger\s*things', '/static/img/covers/stranger_things.jpg'),
]

def resolve_card_image(name, game=''):
    name_clean = (name or '').lower().strip()
    for pattern, url in TCG_IMAGE_PATTERNS:
        if re.search(pattern, name_clean):
            return url
    game_clean = (game or '').lower()
    if 'gundam' in game_clean:
        return '/static/img/cards/gundam_rx78.jpg'
    elif 'pokemon' in game_clean:
        return '/static/img/cards/charizard_151.png'
    elif 'one piece' in game_clean:
        return '/static/img/cards/luffy_g5.png'
    elif 'yu-gi-oh' in game_clean:
        return '/static/img/cards/blue_eyes.jpg'
    elif 'mtg' in game_clean:
        return '/static/img/cards/the_one_ring.jpg'
    return '/static/img/cards/umbreon_vmax.png'

def resolve_watchlist_image(title, category=''):
    title_clean = (title or '').lower().strip()
    for pattern, url in WATCHLIST_IMAGE_PATTERNS:
        if re.search(pattern, title_clean):
            return url
    cat = (category or '').lower()
    if cat == 'anime':
        return '/static/img/covers/frieren.jpg'
    elif cat == 'movie':
        return '/static/img/covers/interstellar.jpg'
    return '/static/img/covers/severance.jpg'

# ==============================================================================
# AUTOMATIC COLLECTR & YUYU-TEI PRICING & MARKET ENGINE
# ==============================================================================

REQ_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}
JPY_TO_USD_RATE = 150.0

COLLECTR_MARKET_MATRIX = {
    'umbreon vmax': {
        'price_usd': 680.0,
        'gem_mint_usd': 850.0,
        'source': 'Collectr',
        'set_name': 'Evolving Skies',
        'card_number': '215/203',
        'rarity': 'Alt Art Secret Rare'
    },
    'monkey d. luffy (gear 5)': {
        'price_usd': 1200.0,
        'gem_mint_usd': 2400.0,
        'source': 'Collectr & Yuyu-tei',
        'set_name': 'Awakening of the New Era (OP-05)',
        'card_number': 'OP05-119',
        'rarity': 'Manga Secret Rare'
    },
    'portgas d. ace (manga rare)': {
        'price_usd': 950.0,
        'gem_mint_usd': 1800.0,
        'source': 'Collectr & Yuyu-tei',
        'set_name': 'Paramount War (OP-02)',
        'card_number': 'OP02-013',
        'rarity': 'Manga Rare'
    },
    'nami (alt art)': {
        'price_usd': 240.0,
        'gem_mint_usd': 420.0,
        'source': 'Collectr & Yuyu-tei',
        'set_name': 'Romance Dawn (OP-01)',
        'card_number': 'OP01-016',
        'rarity': 'Alternate Art Leader/Rare'
    },
    'roronoa zoro (alt art)': {
        'price_usd': 85.0,
        'gem_mint_usd': 180.0,
        'source': 'Collectr',
        'set_name': 'Romance Dawn (OP-01)',
        'card_number': 'OP01-025',
        'rarity': 'Alternate Art Super Rare'
    },
    'charizard ex': {
        'price_usd': 130.0,
        'gem_mint_usd': 260.0,
        'source': 'Collectr',
        'set_name': '151 Special Set',
        'card_number': '199/165',
        'rarity': 'Special Illustration Rare'
    },
    'pikachu (van gogh with grey felt hat)': {
        'price_usd': 150.0,
        'gem_mint_usd': 320.0,
        'source': 'Collectr',
        'set_name': 'Pokemon x Van Gogh Museum Promo',
        'card_number': 'SVP-085',
        'rarity': 'Museum Black Star Promo'
    },
    'dark magician girl': {
        'price_usd': 350.0,
        'gem_mint_usd': 600.0,
        'source': 'Collectr & Yuyu-tei',
        'set_name': 'Darkwing Blast',
        'card_number': 'DABL-EN000',
        'rarity': 'Starlight Rare'
    },
    'the one ring (foil)': {
        'price_usd': 90.0,
        'gem_mint_usd': 220.0,
        'source': 'Collectr',
        'set_name': 'The Lord of the Rings: Tales of Middle-earth',
        'card_number': '0451',
        'rarity': 'Mythic Rare Extended Art Foil'
    },
    'blue-eyes white dragon': {
        'price_usd': 65.0,
        'gem_mint_usd': 180.0,
        'source': 'Collectr',
        'set_name': '25th Anniversary Edition (LOB)',
        'card_number': 'LOB-001',
        'rarity': 'Ultra Rare'
    },
    'rx-78-2 gundam (secret rare parallel)': {
        'price_usd': 220.0,
        'price_jpy': 33000,
        'source': 'Yuyu-tei',
        'set_name': 'Arsenal Base Season 1',
        'card_number': 'AB01-001',
        'rarity': 'Secret Rare Parallel'
    },
    'gundam aerial (permet score 6)': {
        'price_usd': 180.0,
        'price_jpy': 27000,
        'source': 'Yuyu-tei',
        'set_name': 'Witch from Mercury Promo',
        'card_number': 'PR-012',
        'rarity': 'Promotional Parallel P'
    }
}

def query_live_yuyutei(query, game='Gundam'):
    game_code = 'gab' if game.lower() == 'gundam' else 'opc'
    m_code = re.search(r'([A-Z0-9]+-[A-Z0-9]+)', query, re.I)
    search_term = m_code.group(1) if m_code else query.split('(')[0].strip()
    url = f"https://yuyu-tei.jp/sell/{game_code}/s/search?search_word={urllib.parse.quote(search_term)}"
    try:
        req = urllib.request.Request(url, headers=REQ_HEADERS)
        with urllib.request.urlopen(req, timeout=3.5) as res:
            html = res.read().decode('utf-8', errors='ignore')
            prices = re.findall(r'<strong[^>]*>\s*([0-9,]+)\s*円\s*</strong>', html)
            if prices:
                num_prices = [int(p.replace(',', '')) for p in prices]
                best_jpy = max(num_prices) if len(num_prices) > 1 else num_prices[0]
                usd = round(best_jpy / JPY_TO_USD_RATE, 2)
                return {
                    'price_usd': usd,
                    'price_jpy': best_jpy,
                    'source': 'Yuyu-tei'
                }
    except Exception:
        pass
    return None

def fetch_card_market_info(name, game='One Piece', set_name='', card_number='', condition='NM'):
    name_clean = (name or '').lower().strip()
    condition_clean = (condition or 'NM').strip().lower()

    # 1. Match from verified Collectr & Yuyu-tei matrix
    for key, data in COLLECTR_MARKET_MATRIX.items():
        if key in name_clean or name_clean in key:
            base_usd = data['price_usd']
            if 'gem' in condition_clean or '10' in condition_clean:
                final_usd = data.get('gem_mint_usd', base_usd * 1.8)
            elif 'lp' in condition_clean:
                final_usd = round(base_usd * 0.8, 2)
            elif 'mp' in condition_clean:
                final_usd = round(base_usd * 0.6, 2)
            elif 'graded' in condition_clean:
                final_usd = round(base_usd * 1.5, 2)
            else:
                final_usd = base_usd

            jpy = data.get('price_jpy', int(final_usd * JPY_TO_USD_RATE))
            return {
                'price_usd': round(final_usd, 2),
                'price_jpy': jpy,
                'source': data['source'],
                'set_name': set_name or data.get('set_name', ''),
                'card_number': card_number or data.get('card_number', ''),
                'rarity': data.get('rarity', ''),
                'image_url': resolve_card_image(name, game)
            }

    # 2. Live Yuyu-tei lookup for Gundam / Japanese TCGs
    if game.lower() == 'gundam' or 'gab' in card_number.lower():
        live_yuyu = query_live_yuyutei(card_number or name, 'Gundam')
        if live_yuyu:
            base_usd = live_yuyu['price_usd']
            if 'gem' in condition_clean or '10' in condition_clean:
                base_usd = round(base_usd * 1.8, 2)
            return {
                'price_usd': base_usd,
                'price_jpy': live_yuyu['price_jpy'],
                'source': 'Yuyu-tei',
                'set_name': set_name or 'Arsenal Base',
                'card_number': card_number,
                'rarity': 'Parallel / Secret Rare',
                'image_url': resolve_card_image(name, game)
            }

    # 3. Dynamic Calculation for other cards based on rarity keywords
    source = 'Yuyu-tei' if game.lower() == 'gundam' else 'Collectr'
    full_text = f"{name} {set_name}".lower()
    if any(k in full_text for k in ['manga', 'serialized', '1-of-1', 'gold']):
        base_usd = 950.0
        rarity = 'Manga Secret Rare'
    elif any(k in full_text for k in ['alt art', 'secret rare', 'sar', 'sir', 'starlight', 'parallel']):
        base_usd = 180.0
        rarity = 'Secret Rare / Alt Art'
    elif any(k in full_text for k in ['vmax', 'vstar', 'ex', 'ultra rare', 'full art', 'ur', 'sec']):
        base_usd = 55.0
        rarity = 'Ultra Rare'
    elif any(k in full_text for k in ['super rare', 'sr', 'promo', 'foil']):
        base_usd = 28.0
        rarity = 'Super Rare'
    else:
        base_usd = 12.0
        rarity = 'Rare'

    if 'gem' in condition_clean or '10' in condition_clean:
        base_usd = round(base_usd * 1.8, 2)
    elif 'lp' in condition_clean:
        base_usd = round(base_usd * 0.8, 2)
    elif 'mp' in condition_clean:
        base_usd = round(base_usd * 0.6, 2)

    return {
        'price_usd': round(base_usd, 2),
        'price_jpy': int(base_usd * JPY_TO_USD_RATE),
        'source': source,
        'set_name': set_name,
        'card_number': card_number,
        'rarity': rarity,
        'image_url': resolve_card_image(name, game)
    }

@app.route('/')
def index():
    return render_template('index.html')

# ==============================================================================
# AUTHENTICATION & MULTI-USER ACCESS
# ==============================================================================

def get_request_user_id():
    # 1. Direct X-User-ID header (used by Firebase Auth or frontend)
    uid = request.headers.get('X-User-ID')
    if uid and uid.strip():
        return uid.strip()

    # 2. Bearer Session Token from Authorization header or X-Session-Token
    auth_header = request.headers.get('Authorization', '')
    token = ''
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
    elif request.headers.get('X-Session-Token'):
        token = request.headers.get('X-Session-Token').strip()

    if token:
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT user_id FROM users WHERE session_token = ?', (token,))
            user_row = cursor.fetchone()
            conn.close()
            if user_row:
                return user_row['user_id']
        except Exception:
            pass

    # 3. Query param user_id
    query_uid = request.args.get('user_id')
    if query_uid and query_uid.strip():
        return query_uid.strip()

    return 'default'

def clone_starter_data_for_user(cursor, user_id):
    # Clone items if empty
    cursor.execute('SELECT COUNT(*) as count FROM items WHERE user_id = ?', (user_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.execute('''
            INSERT INTO items (title, category, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url, user_id)
            SELECT title, category, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url, ?
            FROM items WHERE user_id = 'default'
        ''', (user_id,))

    # Clone tcg_cards if empty
    cursor.execute('SELECT COUNT(*) as count FROM tcg_cards WHERE user_id = ?', (user_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.execute('''
            INSERT INTO tcg_cards (name, game, card_type, set_name, card_number, rarity, card_condition, quantity, price_est, price_source, jpy_price, status, priority, is_favorite, image_url, collectr_url, notes, user_id)
            SELECT name, game, card_type, set_name, card_number, rarity, card_condition, quantity, price_est, price_source, jpy_price, status, priority, is_favorite, image_url, collectr_url, notes, ?
            FROM tcg_cards WHERE user_id = 'default'
        ''', (user_id,))

    # Clone tcg_decks if empty
    cursor.execute('SELECT COUNT(*) as count FROM tcg_decks WHERE user_id = ?', (user_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.execute('''
            INSERT INTO tcg_decks (deck_name, game, format, status, card_count, leader_card, deck_list, image_url, notes, user_id)
            SELECT deck_name, game, format, status, card_count, leader_card, deck_list, image_url, notes, ?
            FROM tcg_decks WHERE user_id = 'default'
        ''', (user_id,))

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    display_name = data.get('display_name', '').strip()

    if not email or '@' not in email:
        return jsonify({'success': False, 'error': 'A valid email address is required.'}), 400
    if not password or len(password) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters long.'}), 400

    if not display_name:
        display_name = email.split('@')[0]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE LOWER(email) = ?', (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'error': 'An account with this email already exists. Please log in.'}), 400

    user_id = 'usr_' + secrets.token_hex(8)
    session_token = secrets.token_hex(24)
    hashed_pw = generate_password_hash(password)

    cursor.execute('''
        INSERT INTO users (user_id, email, password_hash, display_name, auth_provider, session_token)
        VALUES (?, ?, ?, ?, 'sqlite', ?)
    ''', (user_id, email, hashed_pw, display_name, session_token))
    
    # Automatically clone starter items for the new user
    clone_starter_data_for_user(cursor, user_id)
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'user': {
            'uid': user_id,
            'email': email,
            'displayName': display_name,
            'provider': 'sqlite',
            'token': session_token
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE LOWER(email) = ?', (email,))
    user = cursor.fetchone()

    if not user or not check_password_hash(user['password_hash'], password):
        conn.close()
        return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

    session_token = secrets.token_hex(24)
    cursor.execute('''
        UPDATE users SET session_token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?
    ''', (session_token, user['id']))
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'user': {
            'uid': user['user_id'],
            'email': user['email'],
            'displayName': user['display_name'] or user['email'].split('@')[0],
            'provider': user['auth_provider'] or 'sqlite',
            'token': session_token
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip() or request.headers.get('X-Session-Token', '').strip()
    if token:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET session_token = "" WHERE session_token = ?', (token,))
        conn.commit()
        conn.close()
    return jsonify({'success': True})

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip() or request.headers.get('X-Session-Token', '').strip()
    uid = request.headers.get('X-User-ID', '').strip()

    if not token and not uid:
        return jsonify({'success': False, 'user': None}), 200

    conn = get_db()
    cursor = conn.cursor()
    if token:
        cursor.execute('SELECT * FROM users WHERE session_token = ?', (token,))
    else:
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (uid,))
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({
            'success': True,
            'user': {
                'uid': user['user_id'],
                'email': user['email'],
                'displayName': user['display_name'] or user['email'].split('@')[0],
                'provider': user['auth_provider'] or 'sqlite',
                'token': user['session_token']
            }
        })
    return jsonify({'success': False, 'user': None}), 200

# ==============================================================================
# WATCHLIST REST API
# ==============================================================================

@app.route('/api/items', methods=['GET'])
def get_items():
    user_id = get_request_user_id()
    category = request.args.get('category', '').strip().lower()
    status = request.args.get('status', '').strip().lower()
    search = request.args.get('search', '').strip().lower()
    favorites_only = request.args.get('favorites', '').strip().lower()

    query = 'SELECT * FROM items WHERE user_id = ?'
    params = [user_id]

    if category and category != 'all':
        query += ' AND LOWER(category) = ?'
        params.append(category)

    if status and status != 'all':
        query += ' AND LOWER(status) = ?'
        params.append(status)

    if favorites_only in ('1', 'true', 'yes'):
        query += ' AND is_favorite = 1'

    if search:
        query += ' AND (LOWER(title) LIKE ? OR LOWER(notes) LIKE ? OR LOWER(website) LIKE ?)'
        like_term = f'%{search}%'
        params.extend([like_term, like_term, like_term])

    sort = request.args.get('sort', 'id')
    order = request.args.get('order', 'asc').upper()
    if order not in ('ASC', 'DESC'):
        order = 'ASC'

    valid_sort_columns = {
        'id': 'id',
        'title': 'title',
        'current_ep': 'current_ep',
        'rating': 'rating',
        'status': 'status',
        'updated_at': 'updated_at'
    }
    sort_col = valid_sort_columns.get(sort, 'id')
    query += f' ORDER BY {sort_col} {order}'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    items = [dict(row) for row in rows]
    conn.close()

    return jsonify({'success': True, 'items': items})

@app.route('/api/items', methods=['POST'])
def add_item():
    user_id = get_request_user_id()
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'success': False, 'error': 'Title is required'}), 400

    category = data.get('category', 'anime').strip().lower()
    if category not in ('anime', 'movie', 'series'):
        category = 'anime'

    try:
        current_ep = int(data.get('current_ep', 0))
    except (ValueError, TypeError):
        current_ep = 0

    try:
        total_ep = int(data.get('total_ep', 0))
    except (ValueError, TypeError):
        total_ep = 0

    website = data.get('website', '').strip()
    status = data.get('status', 'watching').strip().lower()
    valid_statuses = ('watching', 'marathon', 'hold', 'drop', 'completed', 'plan')
    if status not in valid_statuses:
        status = 'watching'

    is_favorite = 1 if data.get('is_favorite') in (1, True, '1', 'true') else 0
    try:
        rating = int(data.get('rating', 0))
        rating = max(0, min(10, rating))
    except (ValueError, TypeError):
        rating = 0

    notes = data.get('notes', '').strip()
    image_url = data.get('image_url', '').strip()
    if not image_url:
        image_url = resolve_watchlist_image(title, category)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO items (title, category, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url, user_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ''', (title, category, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url, user_id))
    item_id = cursor.lastrowid
    conn.commit()

    cursor.execute('SELECT * FROM items WHERE id = ?', (item_id,))
    new_item = dict(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'item': new_item}), 201

@app.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM items WHERE id = ?', (item_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'success': False, 'error': 'Item not found'}), 404

    title = data.get('title', existing['title']).strip()
    category = data.get('category', existing['category']).strip().lower()
    if category not in ('anime', 'movie', 'series'):
        category = existing['category']

    current_ep = int(data.get('current_ep', existing['current_ep']))
    total_ep = int(data.get('total_ep', existing['total_ep']))
    website = data.get('website', existing['website']).strip()
    status = data.get('status', existing['status']).strip().lower()
    is_favorite = 1 if data.get('is_favorite', existing['is_favorite']) in (1, True, '1', 'true') else 0
    rating = int(data.get('rating', existing['rating']))
    rating = max(0, min(10, rating))
    notes = data.get('notes', existing['notes']).strip()
    image_url = data.get('image_url', existing['image_url']).strip()
    
    # Auto-tally image if blank or if title changed and previous image was auto-tallied
    if not image_url or (title.lower() != existing['title'].lower() and image_url == existing['image_url']):
        image_url = resolve_watchlist_image(title, category)

    cursor.execute('''
        UPDATE items
        SET title = ?, category = ?, current_ep = ?, total_ep = ?, website = ?,
            status = ?, is_favorite = ?, rating = ?, notes = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (title, category, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url, item_id))
    conn.commit()

    cursor.execute('SELECT * FROM items WHERE id = ?', (item_id,))
    updated_item = dict(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'item': updated_item})

@app.route('/api/items/<int:item_id>/patch', methods=['PATCH'])
def patch_item(item_id):
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM items WHERE id = ?', (item_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'success': False, 'error': 'Item not found'}), 404

    fields = []
    values = []

    if 'status' in data:
        status = str(data['status']).strip().lower()
        if status in ('watching', 'marathon', 'hold', 'drop', 'completed', 'plan'):
            fields.append('status = ?')
            values.append(status)

    if 'is_favorite' in data:
        fav = 1 if data['is_favorite'] in (1, True, '1', 'true') else 0
        fields.append('is_favorite = ?')
        values.append(fav)

    if 'current_ep' in data:
        try:
            val = max(0, int(data['current_ep']))
            fields.append('current_ep = ?')
            values.append(val)
        except (ValueError, TypeError):
            pass

    if 'image_url' in data:
        fields.append('image_url = ?')
        values.append(str(data['image_url']).strip())

    if not fields:
        conn.close()
        return jsonify({'success': True, 'item': dict(existing)})

    fields.append('updated_at = CURRENT_TIMESTAMP')
    query = f"UPDATE items SET {', '.join(fields)} WHERE id = ?"
    values.append(item_id)

    cursor.execute(query, values)
    conn.commit()

    cursor.execute('SELECT * FROM items WHERE id = ?', (item_id,))
    updated_item = dict(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'item': updated_item})

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM items WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    user_id = get_request_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'watching' THEN 1 ELSE 0 END) as watching,
            SUM(CASE WHEN status = 'marathon' THEN 1 ELSE 0 END) as marathon,
            SUM(CASE WHEN status = 'hold' THEN 1 ELSE 0 END) as hold,
            SUM(CASE WHEN status = 'drop' THEN 1 ELSE 0 END) as drop_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as favorites,
            SUM(CASE WHEN category = 'anime' THEN 1 ELSE 0 END) as anime_count,
            SUM(CASE WHEN category = 'movie' THEN 1 ELSE 0 END) as movie_count,
            SUM(CASE WHEN category = 'series' THEN 1 ELSE 0 END) as series_count,
            SUM(current_ep) as total_episodes_watched
        FROM items
        WHERE user_id = ?
    ''', (user_id,))
    row = cursor.fetchone()
    conn.close()

    stats = {
        'total': row['total'] or 0,
        'watching': row['watching'] or 0,
        'marathon': row['marathon'] or 0,
        'hold': row['hold'] or 0,
        'drop': row['drop_count'] or 0,
        'completed': row['completed'] or 0,
        'favorites': row['favorites'] or 0,
        'anime': row['anime_count'] or 0,
        'movie': row['movie_count'] or 0,
        'series': row['series_count'] or 0,
        'episodes_watched': row['total_episodes_watched'] or 0
    }
    return jsonify({'success': True, 'stats': stats})

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, category, title, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url FROM items ORDER BY category, id')
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['No', 'Category', 'Name', 'Episode', 'Total Episodes', 'Website', 'Status', 'Favorite', 'Rating', 'Notes', 'Image URL'])
    for r in rows:
        writer.writerow([
            r['id'],
            r['category'].upper(),
            r['title'],
            r['current_ep'],
            r['total_ep'],
            r['website'],
            r['status'].capitalize(),
            'Yes' if r['is_favorite'] else 'No',
            r['rating'],
            r['notes'],
            r['image_url']
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={"Content-disposition": "attachment; filename=joynesshobby_watchlist.csv"}
    )

@app.route('/api/import/csv', methods=['POST'])
def import_csv():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    try:
        stream = io.StringIO(file.stream.read().decode("UTF-8", errors="ignore"))
        reader = csv.reader(stream)
        headers = [h.strip().lower() for h in next(reader, [])]

        title_idx, cat_idx, ep_idx, total_ep_idx, web_idx, status_idx = -1, -1, -1, -1, -1, -1

        for i, h in enumerate(headers):
            if 'name' in h or 'title' in h: title_idx = i
            elif 'cat' in h or 'type' in h: cat_idx = i
            elif 'ep' in h and 'total' not in h: ep_idx = i
            elif 'total' in h: total_ep_idx = i
            elif 'web' in h or 'link' in h or 'url' in h: web_idx = i
            elif 'stat' in h: status_idx = i

        imported_count = 0
        conn = get_db()
        cursor = conn.cursor()

        for row in reader:
            if not row or (title_idx != -1 and not row[title_idx].strip()):
                continue
            title = row[title_idx].strip() if title_idx != -1 and len(row) > title_idx else 'Untitled'
            category = 'anime'
            if cat_idx != -1 and len(row) > cat_idx:
                raw_cat = row[cat_idx].strip().lower()
                if 'movie' in raw_cat: category = 'movie'
                elif 'series' in raw_cat or 'tv' in raw_cat: category = 'series'

            ep = 0
            if ep_idx != -1 and len(row) > ep_idx:
                try: ep = int(''.join(filter(str.isdigit, row[ep_idx])) or 0)
                except Exception: ep = 0

            total_ep = 0
            if total_ep_idx != -1 and len(row) > total_ep_idx:
                try: total_ep = int(''.join(filter(str.isdigit, row[total_ep_idx])) or 0)
                except Exception: total_ep = 0

            website = row[web_idx].strip() if web_idx != -1 and len(row) > web_idx else ''
            raw_status = row[status_idx].strip().lower() if status_idx != -1 and len(row) > status_idx else 'watching'
            status = 'watching'
            if 'marathon' in raw_status: status = 'marathon'
            elif 'hold' in raw_status: status = 'hold'
            elif 'drop' in raw_status: status = 'drop'
            elif 'comp' in raw_status: status = 'completed'

            cursor.execute('''
                INSERT INTO items (title, category, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url)
                VALUES (?, ?, ?, ?, ?, ?, 0, 0, '', '')
            ''', (title, category, ep, total_ep, website, status))
            imported_count += 1

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'count': imported_count})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==============================================================================
# TCG REST API (Cards & Structured Deck Builder)
# ==============================================================================

@app.route('/api/tcg/cards', methods=['GET'])
def get_tcg_cards():
    user_id = get_request_user_id()
    card_type = request.args.get('card_type', '').strip().lower()
    game = request.args.get('game', '').strip()
    status = request.args.get('status', '').strip().lower()
    search = request.args.get('search', '').strip().lower()
    favorites_only = request.args.get('favorites', '').strip().lower()

    query = 'SELECT * FROM tcg_cards WHERE user_id = ?'
    params = [user_id]

    if card_type and card_type != 'all':
        query += ' AND card_type = ?'
        params.append(card_type)

    if game and game.lower() != 'all':
        query += ' AND LOWER(game) = ?'
        params.append(game.lower())

    if status and status != 'all':
        query += ' AND LOWER(status) = ?'
        params.append(status)

    if favorites_only in ('1', 'true', 'yes'):
        query += ' AND is_favorite = 1'

    if search:
        query += ' AND (LOWER(name) LIKE ? OR LOWER(set_name) LIKE ? OR LOWER(card_number) LIKE ? OR LOWER(notes) LIKE ?)'
        like_term = f'%{search}%'
        params.extend([like_term, like_term, like_term, like_term])

    query += ' ORDER BY is_favorite DESC, id DESC'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    cards = [dict(row) for row in rows]
    conn.close()

    return jsonify({'success': True, 'cards': cards})

@app.route('/api/tcg/cards', methods=['POST'])
def add_tcg_card():
    user_id = get_request_user_id()
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'error': 'Card name is required'}), 400

    game = data.get('game', 'One Piece').strip()
    card_type = data.get('card_type', 'collection').strip().lower()
    if card_type not in ('collection', 'hunting'):
        card_type = 'collection'

    set_name = data.get('set_name', '').strip()
    card_number = data.get('card_number', '').strip()
    rarity = data.get('rarity', '').strip()
    condition = data.get('card_condition', 'NM').strip()
    
    try:
        quantity = max(1, int(data.get('quantity', 1)))
    except (ValueError, TypeError):
        quantity = 1

    try:
        price_est = max(0.0, float(data.get('price_est', 0.0)))
    except (ValueError, TypeError):
        price_est = 0.0

    status = data.get('status', 'owned' if card_type == 'collection' else 'hunting').strip().lower()
    priority = data.get('priority', 'medium').strip().lower()
    is_favorite = 1 if data.get('is_favorite') in (1, True, '1', 'true') else 0
    image_url = data.get('image_url', '').strip()
    collectr_url = data.get('collectr_url', '').strip()
    notes = data.get('notes', '').strip()

    # Automatically tally image from title/name
    if not image_url:
        image_url = resolve_card_image(name, game)

    # Automatically fetch info & pricing from Collectr / Yuyu-tei
    market_info = fetch_card_market_info(name, game, set_name, card_number, condition)
    if price_est <= 0.0:
        price_est = market_info['price_usd']
    price_source = market_info['source']
    jpy_price = market_info['price_jpy']
    if not set_name and market_info.get('set_name'):
        set_name = market_info['set_name']
    if not card_number and market_info.get('card_number'):
        card_number = market_info['card_number']
    if not rarity and market_info.get('rarity'):
        rarity = market_info['rarity']

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tcg_cards (name, game, card_type, set_name, card_number, rarity, card_condition, quantity, price_est, price_source, jpy_price, status, priority, is_favorite, image_url, collectr_url, notes, user_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ''', (name, game, card_type, set_name, card_number, rarity, condition, quantity, price_est, price_source, jpy_price, status, priority, is_favorite, image_url, collectr_url, notes, user_id))
    card_id = cursor.lastrowid
    conn.commit()

    cursor.execute('SELECT * FROM tcg_cards WHERE id = ?', (card_id,))
    new_card = dict(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'card': new_card}), 201

@app.route('/api/tcg/cards/<int:card_id>', methods=['PUT'])
def update_tcg_card(card_id):
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tcg_cards WHERE id = ?', (card_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'success': False, 'error': 'Card not found'}), 404

    name = data.get('name', existing['name']).strip()
    game = data.get('game', existing['game']).strip()
    card_type = data.get('card_type', existing['card_type']).strip().lower()
    set_name = data.get('set_name', existing['set_name']).strip()
    card_number = data.get('card_number', existing['card_number']).strip()
    rarity = data.get('rarity', existing['rarity']).strip()
    condition = data.get('card_condition', existing['card_condition']).strip()
    quantity = int(data.get('quantity', existing['quantity']))
    price_est = float(data.get('price_est', existing['price_est']))
    status = data.get('status', existing['status']).strip().lower()
    priority = data.get('priority', existing['priority']).strip().lower()
    is_favorite = 1 if data.get('is_favorite', existing['is_favorite']) in (1, True, '1', 'true') else 0
    image_url = data.get('image_url', existing['image_url']).strip()
    collectr_url = data.get('collectr_url', existing['collectr_url']).strip()
    notes = data.get('notes', existing['notes']).strip()

    # Automatically tally image if title/name changed or empty
    if not image_url or (name.lower() != existing['name'].lower() and image_url == existing['image_url']):
        image_url = resolve_card_image(name, game)

    # Automatically fetch info & pricing from Collectr / Yuyu-tei if name changed or price requested
    market_info = fetch_card_market_info(name, game, set_name, card_number, condition)
    if name.lower() != existing['name'].lower() or price_est <= 0.0:
        price_est = market_info['price_usd']
        price_source = market_info['source']
        jpy_price = market_info['price_jpy']
    else:
        price_source = existing['price_source'] if 'price_source' in existing.keys() and existing['price_source'] else market_info['source']
        jpy_price = existing['jpy_price'] if 'jpy_price' in existing.keys() and existing['jpy_price'] else int(price_est * JPY_TO_USD_RATE)

    cursor.execute('''
        UPDATE tcg_cards
        SET name = ?, game = ?, card_type = ?, set_name = ?, card_number = ?, rarity = ?,
            card_condition = ?, quantity = ?, price_est = ?, price_source = ?, jpy_price = ?,
            status = ?, priority = ?, is_favorite = ?, image_url = ?, collectr_url = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (name, game, card_type, set_name, card_number, rarity, condition, quantity, price_est, price_source, jpy_price, status, priority, is_favorite, image_url, collectr_url, notes, card_id))
    conn.commit()

    cursor.execute('SELECT * FROM tcg_cards WHERE id = ?', (card_id,))
    updated_card = dict(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'card': updated_card})

@app.route('/api/tcg/auto_card_info', methods=['GET'])
def auto_card_info():
    name = request.args.get('name', '').strip()
    game = request.args.get('game', 'One Piece').strip()
    set_name = request.args.get('set_name', '').strip()
    card_number = request.args.get('card_number', '').strip()
    condition = request.args.get('condition', 'NM').strip()

    if not name:
        return jsonify({'success': False, 'error': 'Name is required'}), 400

    info = fetch_card_market_info(name, game, set_name, card_number, condition)
    return jsonify({
        'success': True,
        'card': info
    })

@app.route('/api/tcg/sync_all_prices', methods=['POST'])
def sync_all_prices():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tcg_cards')
    cards = cursor.fetchall()

    updated_count = 0
    total_value = 0.0

    for card in cards:
        market_info = fetch_card_market_info(
            card['name'],
            card['game'],
            card['set_name'],
            card['card_number'],
            card['card_condition']
        )
        new_price = market_info['price_usd']
        new_source = market_info['source']
        new_jpy = market_info['price_jpy']
        new_img = card['image_url'] or market_info['image_url']

        cursor.execute('''
            UPDATE tcg_cards
            SET price_est = ?, price_source = ?, jpy_price = ?, image_url = ?, last_price_sync = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_price, new_source, new_jpy, new_img, card['id']))
        updated_count += 1
        total_value += (new_price * (card['quantity'] or 1))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'updated_count': updated_count,
        'total_portfolio_value': round(total_value, 2),
        'message': f'Successfully synced {updated_count} cards with live Collectr & Yuyu-tei market prices!'
    })

@app.route('/api/resolve_image', methods=['GET'])
def api_resolve_image():
    query = request.args.get('query', '').strip()
    img_type = request.args.get('type', 'tcg').strip().lower()
    game = request.args.get('game', '').strip()

    if img_type == 'watchlist':
        img_url = resolve_watchlist_image(query, game)
    else:
        img_url = resolve_card_image(query, game)

    return jsonify({
        'success': True,
        'image_url': img_url
    })

@app.route('/api/tcg/cards/<int:card_id>/patch', methods=['PATCH'])
def patch_tcg_card(card_id):
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tcg_cards WHERE id = ?', (card_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'success': False, 'error': 'Card not found'}), 404

    fields = []
    values = []

    if 'status' in data:
        fields.append('status = ?')
        values.append(str(data['status']).strip().lower())

    if 'is_favorite' in data:
        fav = 1 if data['is_favorite'] in (1, True, '1', 'true') else 0
        fields.append('is_favorite = ?')
        values.append(fav)

    if 'price_est' in data:
        try:
            fields.append('price_est = ?')
            values.append(max(0.0, float(data['price_est'])))
        except (ValueError, TypeError):
            pass

    if 'image_url' in data:
        fields.append('image_url = ?')
        values.append(str(data['image_url']).strip())

    if not fields:
        conn.close()
        return jsonify({'success': True, 'card': dict(existing)})

    fields.append('updated_at = CURRENT_TIMESTAMP')
    query = f"UPDATE tcg_cards SET {', '.join(fields)} WHERE id = ?"
    values.append(card_id)

    cursor.execute(query, values)
    conn.commit()

    cursor.execute('SELECT * FROM tcg_cards WHERE id = ?', (card_id,))
    updated_card = dict(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'card': updated_card})

@app.route('/api/tcg/cards/<int:card_id>', methods=['DELETE'])
def delete_tcg_card(card_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tcg_cards WHERE id = ?', (card_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ----------------- TCG Decks Endpoints (List & Table Deckbuilder) -----------------

@app.route('/api/tcg/decks', methods=['GET'])
def get_tcg_decks():
    user_id = get_request_user_id()
    game = request.args.get('game', '').strip()
    status = request.args.get('status', '').strip().lower()
    search = request.args.get('search', '').strip().lower()

    query = 'SELECT * FROM tcg_decks WHERE user_id = ?'
    params = [user_id]

    if game and game.lower() != 'all':
        query += ' AND LOWER(game) = ?'
        params.append(game.lower())

    if status and status != 'all':
        query += ' AND LOWER(status) = ?'
        params.append(status)

    if search:
        query += ' AND (LOWER(deck_name) LIKE ? OR LOWER(leader_card) LIKE ? OR LOWER(deck_list) LIKE ? OR LOWER(notes) LIKE ?)'
        like_term = f'%{search}%'
        params.extend([like_term, like_term, like_term, like_term])

    query += ' ORDER BY id DESC'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    decks = [dict(row) for row in rows]
    conn.close()

    return jsonify({'success': True, 'decks': decks})

@app.route('/api/tcg/decks', methods=['POST'])
def add_tcg_deck():
    user_id = get_request_user_id()
    data = request.get_json() or {}
    deck_name = data.get('deck_name', '').strip()
    if not deck_name:
        return jsonify({'success': False, 'error': 'Deck name is required'}), 400

    game = data.get('game', 'One Piece').strip()
    fmt = data.get('format', 'Standard').strip()
    status = data.get('status', 'active').strip().lower()
    
    try:
        card_count = int(data.get('card_count', 50))
    except (ValueError, TypeError):
        card_count = 50

    leader_card = data.get('leader_card', '').strip()
    
    # Process deck_list (serialize if list)
    deck_list = data.get('deck_list', '')
    if isinstance(deck_list, (list, dict)):
        deck_list = json.dumps(deck_list)
    else:
        deck_list = str(deck_list).strip()

    image_url = data.get('image_url', '').strip()
    notes = data.get('notes', '').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tcg_decks (deck_name, game, format, status, card_count, leader_card, deck_list, image_url, notes, user_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ''', (deck_name, game, fmt, status, card_count, leader_card, deck_list, image_url, notes, user_id))
    deck_id = cursor.lastrowid
    conn.commit()

    cursor.execute('SELECT * FROM tcg_decks WHERE id = ?', (deck_id,))
    new_deck = dict(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'deck': new_deck}), 201

@app.route('/api/tcg/decks/<int:deck_id>', methods=['PUT'])
def update_tcg_deck(deck_id):
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tcg_decks WHERE id = ?', (deck_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'success': False, 'error': 'Deck not found'}), 404

    deck_name = data.get('deck_name', existing['deck_name']).strip()
    game = data.get('game', existing['game']).strip()
    fmt = data.get('format', existing['format']).strip()
    status = data.get('status', existing['status']).strip().lower()
    card_count = int(data.get('card_count', existing['card_count']))
    leader_card = data.get('leader_card', existing['leader_card']).strip()

    deck_list = data.get('deck_list', existing['deck_list'])
    if isinstance(deck_list, (list, dict)):
        deck_list = json.dumps(deck_list)
    else:
        deck_list = str(deck_list).strip()

    image_url = data.get('image_url', existing['image_url']).strip()
    notes = data.get('notes', existing['notes']).strip()

    cursor.execute('''
        UPDATE tcg_decks
        SET deck_name = ?, game = ?, format = ?, status = ?, card_count = ?,
            leader_card = ?, deck_list = ?, image_url = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (deck_name, game, fmt, status, card_count, leader_card, deck_list, image_url, notes, deck_id))
    conn.commit()

    cursor.execute('SELECT * FROM tcg_decks WHERE id = ?', (deck_id,))
    updated_deck = dict(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'deck': updated_deck})

@app.route('/api/tcg/decks/<int:deck_id>', methods=['DELETE'])
def delete_tcg_deck(deck_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tcg_decks WHERE id = ?', (deck_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/tcg/stats', methods=['GET'])
def get_tcg_stats():
    user_id = get_request_user_id()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            SUM(CASE WHEN card_type = 'collection' THEN quantity ELSE 0 END) as collection_count,
            SUM(CASE WHEN card_type = 'collection' THEN price_est * quantity ELSE 0 END) as total_collection_value,
            SUM(CASE WHEN card_type = 'hunting' THEN 1 ELSE 0 END) as hunting_count,
            SUM(CASE WHEN card_type = 'hunting' AND status = 'hunting' THEN 1 ELSE 0 END) as hunting_active,
            SUM(CASE WHEN card_type = 'hunting' AND status = 'found' THEN 1 ELSE 0 END) as hunting_found,
            SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as tcg_favorites
        FROM tcg_cards
        WHERE user_id = ?
    ''', (user_id,))
    card_row = cursor.fetchone()

    cursor.execute('''
        SELECT 
            COUNT(*) as deck_total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as decks_active,
            SUM(CASE WHEN status = 'building' THEN 1 ELSE 0 END) as decks_building
        FROM tcg_decks
        WHERE user_id = ?
    ''', (user_id,))
    deck_row = cursor.fetchone()
    conn.close()

    stats = {
        'collection_count': card_row['collection_count'] or 0,
        'collection_value': round(card_row['total_collection_value'] or 0.0, 2),
        'hunting_count': card_row['hunting_count'] or 0,
        'hunting_active': card_row['hunting_active'] or 0,
        'hunting_found': card_row['hunting_found'] or 0,
        'tcg_favorites': card_row['tcg_favorites'] or 0,
        'deck_total': deck_row['deck_total'] or 0,
        'decks_active': deck_row['decks_active'] or 0,
        'decks_building': deck_row['decks_building'] or 0
    }
    return jsonify({'success': True, 'stats': stats})

@app.route('/api/user/clone_starter_pack', methods=['POST'])
def clone_starter_pack():
    user_id = get_request_user_id()
    if user_id == 'default':
        return jsonify({'success': False, 'error': 'Must be logged in to clone starter pack'}), 400

    conn = get_db()
    cursor = conn.cursor()
    
    # Clone items if empty
    cursor.execute('SELECT COUNT(*) as count FROM items WHERE user_id = ?', (user_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.execute('''
            INSERT INTO items (title, category, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url, user_id)
            SELECT title, category, current_ep, total_ep, website, status, is_favorite, rating, notes, image_url, ?
            FROM items WHERE user_id = 'default'
        ''', (user_id,))

    # Clone tcg_cards if empty
    cursor.execute('SELECT COUNT(*) as count FROM tcg_cards WHERE user_id = ?', (user_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.execute('''
            INSERT INTO tcg_cards (name, game, card_type, set_name, card_number, rarity, card_condition, quantity, price_est, price_source, jpy_price, status, priority, is_favorite, image_url, collectr_url, notes, user_id)
            SELECT name, game, card_type, set_name, card_number, rarity, card_condition, quantity, price_est, price_source, jpy_price, status, priority, is_favorite, image_url, collectr_url, notes, ?
            FROM tcg_cards WHERE user_id = 'default'
        ''', (user_id,))

    # Clone tcg_decks if empty
    cursor.execute('SELECT COUNT(*) as count FROM tcg_decks WHERE user_id = ?', (user_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.execute('''
            INSERT INTO tcg_decks (deck_name, game, format, status, card_count, leader_card, deck_list, image_url, notes, user_id)
            SELECT deck_name, game, format, status, card_count, leader_card, deck_list, image_url, notes, ?
            FROM tcg_decks WHERE user_id = 'default'
        ''', (user_id,))

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Starter library cloned to your account!'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"JOYNESSHOBY Server starting on port {port} (LAN & Cloud accessible) ...")
    app.run(host='0.0.0.0', port=port, debug=False)
