import os
import shutil

def build():
    root = os.path.dirname(os.path.abspath(__file__))
    pub = os.path.join(root, 'public')
    os.makedirs(pub, exist_ok=True)

    # 1. Copy index.html to both public/ and root directory
    src_html = os.path.join(root, 'templates', 'index.html')
    dst_pub_html = os.path.join(pub, 'index.html')
    dst_root_html = os.path.join(root, 'index.html')
    shutil.copy2(src_html, dst_pub_html)
    shutil.copy2(src_html, dst_root_html)

    # 2. Copy static folder to public/static
    src_static = os.path.join(root, 'static')
    dst_static = os.path.join(pub, 'static')
    if os.path.exists(dst_static):
        shutil.rmtree(dst_static)
    shutil.copytree(src_static, dst_static)

    # 3. Create _redirects for Netlify SPA routing in public/
    with open(os.path.join(pub, '_redirects'), 'w', encoding='utf-8') as f:
        f.write('/*    /index.html   200\n')

    # 4. Create _redirects in root as well
    with open(os.path.join(root, '_redirects'), 'w', encoding='utf-8') as f:
        f.write('/*    /index.html   200\n')

    print("SUCCESS: Static build ready for Netlify and Firebase Hosting!")

if __name__ == '__main__':
    build()
