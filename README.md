# Board Platform (DRF + Keycloak + Kong + React)

## 공개 URL

| 사용자 (Cloudflare HTTPS) | 서비스 |
|---------------------------|--------|
| https://board.bettercodelab.com | React SPA |
| https://auth.bettercodelab.com | Keycloak |
| https://board.bettercodelab.com/api | Kong → Django |

## Nginx + Cloudflare

`nginx` 컨테이너가 **호스트 80**에서 받습니다.

```text
브라우저 --HTTPS 443--> Cloudflare --HTTP 80--> nginx --+
  auth.bettercodelab.com  → keycloak:8080
  board.bettercodelab.com → frontend:5173
  board.bettercodelab.com/api → kong:8000
```

Cloudflare DNS: `board`, `auth` A 레코드 → 서버 IP, **프록시(주황 구름) ON**.

SSL/TLS 모드: **Flexible** (원본 HTTP 80). Cloudflare가 `X-Forwarded-Proto: https`를 넘깁니다 (`KC_PROXY=edge`).

GCP 방화벽: **TCP 80** 허용.

## Google 로그인

1. `.env` (repo 루트, gitignore됨):

   ```bash
   cp .env.example .env
   # GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 입력
   ```

2. Google Cloud OAuth **Authorized redirect URI**:

   `https://auth.bettercodelab.com/realms/board/broker/google/endpoint`

3. Keycloak 기동 시 entrypoint가 Google IdP(alias `google`) 등록. SPA는 **Google로 로그인** → `idpHint: google`.

## 시작

```bash
docker compose up --build
```

**데모:** `demo` / `demo` · JWT `iss` = `https://auth.bettercodelab.com/realms/board`
