# of.me Platform (DRF + Keycloak + Kong + React)

## 프로젝트 업데이트 현황

| 영역 | 상태 | 메모 |
|------|------|------|
| MSA (user / book / group / feedback) | 적용 | Django 모노리스 대신 서비스별 앱 (`services/*`) |
| 외부 PostgreSQL (Supabase) | 적용 | DB `postgres`, 스키마 `user` / `book` / `group` / `feedback` / `keycloak` 분리 |
| k3s + Traefik Ingress | 적용 | Cloudflare → Traefik → `board` 네임스페이스 워크로드 |
| Sealed Secrets | 적용 | `postgres.env` → `k8s/scripts/seal-secrets.sh` → `k8s/secrets/sealed/` |
| OAuth (Google / Kakao) | 적용 | `k8s/secrets/app.env` → Secret `app-secrets` → Keycloak IdP 등록 |
| Argo CD GitOps | 구성됨 | git push 시 자동 배포용 매니페스트 (`k8s/argocd/`, `k8s/overlays/argocd/`) |
| docker compose | 유지 | 로컬/대안 기동 경로 (`docker compose up --build`) |

**k3s 시크릿·배포 (요약)**

```bash
# 1) 시크릿 원본 작성 (gitignore)
cp k8s/secrets/app.env.example k8s/secrets/app.env
cp k8s/secrets/postgres.env.example k8s/secrets/postgres.env
# 값 입력 후:

# 2) DB 스키마 최초 1회
psql "$DATABASE_URL" -f postgres/init-schemas.sql

# 3) Postgres/Keycloak admin SealedSecret 재생성 + 배포
k8s/scripts/seal-secrets.sh
kubectl -n board create secret generic app-secrets --from-env-file=k8s/secrets/app.env --dry-run=client -o yaml | kubectl apply -f -
k8s/scripts/deploy.sh
# OAuth/DB 변경 후: user/book/group/feedback/keycloak 롤아웃 재시작
```

서비스는 기동 시 `migrate`를 실행하며, 테이블은 각 `POSTGRES_SCHEMA`(`user` / `book` / `group` / `feedback`)에 있어야 합니다. `search_path`에 `public`이 포함되므로, 스키마가 비어 있으면 테이블이 `public`에 생길 수 있습니다 — 그 경우 해당 스키마로 옮기거나 마이그레이션을 스키마 기준으로 다시 맞춥니다.

## 공개 URL

| 사용자 (Cloudflare HTTPS) | 서비스 |
|---------------------------|--------|
| https://log.bettercodelab.com | React SPA (of.me hub) |
| https://auth.bettercodelab.com | Keycloak |
| https://log.bettercodelab.com/api | Kong → user / book / group / feedback services |

`board.bettercodelab.com`은 nginx에서 동일 SPA/API로 호환 라우팅(전환용).

## Nginx + Cloudflare

`nginx` 컨테이너가 **호스트 80**에서 받습니다.

```text
브라우저 --HTTPS 443--> Cloudflare --HTTP 80--> nginx --+
  auth.bettercodelab.com  → keycloak:8080
  log.bettercodelab.com   → frontend:5173
  log.bettercodelab.com/api → kong:8000 → user-service / book-service / group-service / feedback-service
```

Cloudflare DNS: `log`, `auth` A 레코드 → 서버 IP, **프록시(주황 구름) ON**.

SSL/TLS 모드: **Flexible** (원본 HTTP 80). Cloudflare가 `X-Forwarded-Proto: https`를 넘깁니다 (`KC_PROXY=edge`).

GCP 방화벽: **TCP 80** 허용.

## Google 로그인

1. 시크릿 입력 (gitignore):

   - **docker compose:** repo 루트 `.env` (`cp .env.example .env`)
   - **k3s:** `k8s/secrets/app.env` (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`)

2. Google Cloud OAuth **Authorized redirect URI**:

   `https://auth.bettercodelab.com/realms/board/broker/google/endpoint`

3. Keycloak 기동 시 entrypoint가 Google IdP(alias `google`) 등록. SPA는 **Google로 로그인** → `idpHint: google`.

## Kakao 로그인

1. `.env` 또는 `k8s/secrets/app.env`에 `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` 입력 (REST API 키 / Client Secret).

2. [Kakao Developers](https://developers.kakao.com/) 앱 설정:
   - **카카오 로그인** → OpenID Connect **활성화**
   - **동의항목**: 필요한 항목을 활성화 (예: 닉네임 `profile_nickname`, 카카오계정(이메일) `account_email`)
   - Keycloak은 `scope`를 직접 보내지 않으므로, 앱에 설정된 동의항목이 자동 적용됩니다 (`openid`/`profile`은 카카오 동의항목 ID가 아님)
   - **Redirect URI**:

     `https://auth.bettercodelab.com/realms/board/broker/kakao/endpoint`

3. Keycloak 기동 시 entrypoint가 Kakao IdP(alias `kakao`) 등록. SPA는 **Kakao 로그인** → `idpHint: kakao`.

`.env` / `app.env` 변경 후 Keycloak을 재시작해야 IdP가 등록됩니다.

## MSA (user / book / group)

백엔드는 Django 모노리스(`backend/`) 대신 **서비스별 Django 앱**으로 분리되어 있습니다.

| 서비스 | 경로 | API prefix | DB schema |
|--------|------|------------|-----------|
| user-service | `services/user-service/` | `/api/users/*` | `user` |
| book-service | `services/book-service/` | `/api/books/*`, `/api/quotes/*`, `/api/history/*` | `book` |
| group-service | `services/group-service/` | `/api/groups/*` | `group` |
| keycloak | `keycloak/` | (auth) | `keycloak` |

운영 DB는 **Supabase(또는 호환 Postgres)** 한 인스턴스에 스키마로 분리합니다. 로컬 compose는 `postgres` 컨테이너를 쓸 수 있습니다. 스키마 초기화:

```sql
-- postgres/init-schemas.sql
CREATE SCHEMA IF NOT EXISTS "user";
CREATE SCHEMA IF NOT EXISTS book;
CREATE SCHEMA IF NOT EXISTS "group";
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
