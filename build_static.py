import os
import shutil

def build():
    root = os.path.dirname(os.path.abspath(__file__))
    pub = os.path.join(root, 'public')
    os.makedirs(pub, exist_ok=True)

    # 1. Copy index.html
    src_html = os.path.join(root, 'templates', 'index.html')
    dst_html = os.path.join(pub, 'index.html')
    shutil.copy2(src_html, dst_html)

    # 2. Copy static folder
    src_static = os.path.join(root, 'static')
    dst_static = os.path.join(pub, 'static')
    if os.path.exists(dst_static):
        shutil.rmtree(dst_static)
    shutil.copytree(src_static, dst_static)

    print("SUCCESS: Static build ready in public/ for Firebase Hosting!")

if __name__ == '__main__':
    build()
