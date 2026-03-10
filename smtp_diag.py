"""SMTP 连通性诊断脚本"""
import socket
import ssl
import sys

HOST = "smtpdm.aliyun.com"
PORTS = [465, 587, 25, 80]

print(f"=== SMTP 连通性诊断 ===")
print(f"目标主机: {HOST}")
print(f"Python 版本: {sys.version}")
print()

# 1. DNS 解析
print("[1] DNS 解析:")
try:
    ip = socket.gethostbyname(HOST)
    print(f"  OK {HOST} -> {ip}")
except Exception as e:
    print(f"  FAIL DNS 解析失败: {e}")
    sys.exit(1)

# 2. TCP 连通性
print("\n[2] TCP 连通性 (5s 超时):")
for port in PORTS:
    try:
        sock = socket.create_connection((HOST, port), timeout=5)
        sock.close()
        print(f"  OK 端口 {port}: 连接成功")
    except Exception as e:
        print(f"  FAIL 端口 {port}: {e}")

# 3. SSL 握手测试 (端口 465)
print("\n[3] SSL 握手测试 (端口 465):")

# 3a. 默认 context
print("  [3a] 默认 ssl.create_default_context():")
try:
    ctx = ssl.create_default_context()
    with socket.create_connection((HOST, 465), timeout=5) as raw_sock:
        with ctx.wrap_socket(raw_sock, server_hostname=HOST) as ssl_sock:
            print(f"    OK 握手成功, 协议: {ssl_sock.version()}, 密码: {ssl_sock.cipher()}")
except Exception as e:
    print(f"    FAIL 握手失败: {e}")

# 3b. 不验证证书的 context
print("  [3b] ssl._create_unverified_context():")
try:
    ctx = ssl._create_unverified_context()
    with socket.create_connection((HOST, 465), timeout=5) as raw_sock:
        with ctx.wrap_socket(raw_sock, server_hostname=HOST) as ssl_sock:
            print(f"    OK 握手成功, 协议: {ssl_sock.version()}, 密码: {ssl_sock.cipher()}")
except Exception as e:
    print(f"    FAIL 握手失败: {e}")

# 3c. SSLContext() 裸 context
print("  [3c] ssl.SSLContext() 裸上下文:")
try:
    ctx = ssl.SSLContext()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with socket.create_connection((HOST, 465), timeout=5) as raw_sock:
        with ctx.wrap_socket(raw_sock, server_hostname=HOST) as ssl_sock:
            print(f"    OK 握手成功, 协议: {ssl_sock.version()}, 密码: {ssl_sock.cipher()}")
except Exception as e:
    print(f"    FAIL 握手失败: {e}")

# 3d. SECLEVEL=1
print("  [3d] create_default_context + SECLEVEL=1 + CERT_NONE:")
try:
    ctx = ssl.create_default_context()
    ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with socket.create_connection((HOST, 465), timeout=5) as raw_sock:
        with ctx.wrap_socket(raw_sock, server_hostname=HOST) as ssl_sock:
            print(f"    OK 握手成功, 协议: {ssl_sock.version()}, 密码: {ssl_sock.cipher()}")
except Exception as e:
    print(f"    FAIL 握手失败: {e}")

# 4. SMTP 级别测试
print("\n[4] smtplib 测试:")
import smtplib

# 4a. SMTP_SSL with unverified context
print("  [4a] SMTP_SSL 端口 465 (unverified context):")
try:
    ctx = ssl._create_unverified_context()
    with smtplib.SMTP_SSL(HOST, 465, timeout=10, context=ctx) as s:
        print(f"    OK SMTP_SSL 连接成功")
        s.login("verify@email.husteread.com", "1038HUSTereadHD")
        print(f"    OK 登录成功")
except Exception as e:
    print(f"    FAIL 失败: {e}")

# 4b. SMTP 端口 80 (阿里云特殊端口)
print("  [4b] SMTP 端口 80 (无加密):")
try:
    with smtplib.SMTP(HOST, 80, timeout=10) as s:
        resp = s.ehlo()
        print(f"    OK SMTP 连接成功")
        s.login("verify@email.husteread.com", "1038HUSTereadHD")
        print(f"    OK 登录成功")
except Exception as e:
    print(f"    FAIL 失败: {e}")

print("\n=== 诊断完毕 ===")
