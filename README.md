# of.me Platform (DRF + Keycloak + Kong + React)

## 공개 URL

| 사용자 (Cloudflare HTTPS) | 서비스 |
|---------------------------|--------|
| https://log.bettercodelab.com | React SPA (of.me hub) |
| https://auth.bettercodelab.com | Keycloak |
| https://log.bettercodelab.com/api | Kong → user / book / group services |

`board.bettercodelab.com`은 nginx에서 동일 SPA/API로 호환 라우팅(전환용).

## Nginx + Cloudflare

`nginx` 컨테이너가 **호스트 80**에서 받습니다.

```text
브라우저 --HTTPS 443--> Cloudflare --HTTP 80--> nginx --+
  auth.bettercodelab.com  → keycloak:8080
  log.bettercodelab.com   → frontend:5173
  log.bettercodelab.com/api → kong:8000 → user-service / book-service / group-service
```

Cloudflare DNS: `log`, `auth` A 레코드 → 서버 IP, **프록시(주황 구름) ON**.

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

## Kakao 로그인

1. `.env`에 `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` 입력 (REST API 키 / Client Secret).

2. [Kakao Developers](https://developers.kakao.com/) 앱 설정:
   - **카카오 로그인** → OpenID Connect **활성화**
   - **동의항목**: 필요한 항목을 활성화 (예: 닉네임 `profile_nickname`, 카카오계정(이메일) `account_email`)
   - Keycloak은 `scope`를 직접 보내지 않으므로, 앱에 설정된 동의항목이 자동 적용됩니다 (`openid`/`profile`은 카카오 동의항목 ID가 아님)
   - **Redirect URI**:

     `https://auth.bettercodelab.com/realms/board/broker/kakao/endpoint`

3. Keycloak 기동 시 entrypoint가 Kakao IdP(alias `kakao`) 등록. SPA는 **Kakao 로그인** → `idpHint: kakao`.

`.env` 변경 후 Keycloak 컨테이너를 재시작해야 IdP가 등록됩니다.

## MSA (user / book / group)

백엔드는 Django 모노리스(`backend/`) 대신 **서비스별 Django 앱**으로 분리되어 있습니다.

| 서비스 | 경로 | API prefix | DB schema |
|--------|------|------------|-----------|
| user-service | `services/user-service/` | `/api/users/*` | `board.user` |
| book-service | `services/book-service/` | `/api/books/*`, `/api/quotes/*`, `/api/history/*` | `board.book` |
| group-service | `services/group-service/` | `/api/groups/*` | `board.group` |
| keycloak | `keycloak/` | (auth) | `board.keycloak` |

PostgreSQL 인스턴스는 `postgres` 서비스 1개, DB `board`, 서비스별 스키마로 분리합니다.

기존 `pgdata` 볼륨을 쓰는 경우 Keycloak 스키마를 한 번 수동 생성하세요:

```sql
CREATE SCHEMA IF NOT EXISTS keycloak;
```

- JWT 인증·DB·내부 API 규약은 서비스별 `config/` · `apps/core/`에 두며, env 이름·Kong 헤더는 서비스 간 동일하게 맞춥니다
- group → book 내부 호출: `BOOK_SERVICE_URL` + `INTERNAL_API_KEY` (Docker DNS, 별도 SD 불필요)
- Kong이 path 기준으로 upstream 라우팅

## 시작

```bash
docker compose up --build
```

**데모:** `demo` / `demo` · JWT `iss` = `https://auth.bettercodelab.com/realms/board`
