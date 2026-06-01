# Holy Spirit — Daily Promise API (Frontend Guide)

Base URL (local): `http://localhost:5000`

All authenticated requests:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. User flow (mobile app)

### 1.1 Login (existing)

**Send OTP**

```http
POST /api/auth/user-login
Content-Type: application/json

{ "mobile": "9876543210" }
```

**Verify OTP** → returns JWT

```http
POST /api/auth/verify-otp
Content-Type: application/json

{ "mobile": "9876543210", "code": "123456" }
```

Response:

```json
{
  "token": "eyJhbG...",
  "message": "OTP verified successfully",
  "status": "verified",
  "username": "9876543210@Holyspirit"
}
```

Store `token` in secure storage (AsyncStorage / Keychain).

---

### 1.2 Get my profile

```http
GET /api/users/me
Authorization: Bearer <token>
```

Response:

```json
{
  "status": "Success",
  "data": {
    "_id": "...",
    "mobile": "9876543210",
    "username": "9876543210@Holyspirit",
    "active": true,
    "dailyPromise": false,
    "languagePreference": "telugu"
  }
}
```

| Field | Meaning |
|--------|---------|
| `active` | Account enabled by admin |
| `dailyPromise` | User opted in for **12 AM WhatsApp** daily promise |
| `languagePreference` | `telugu` or `english` — which card/message is sent |

---

### 1.3 Activate daily promise (main API for users)

When the user turns this **ON**, they get **one WhatsApp message per day at 12:00 AM (India)** with **only that day’s** promise card.

- `languagePreference: "telugu"` → Telugu card image + Telugu text  
- `languagePreference: "english"` → English card image + English text  

```http
POST /api/users/activate-daily-promise
Authorization: Bearer <token>
Content-Type: application/json

{
  "languagePreference": "telugu"
}
```

| Body field | Type | Required | Values |
|------------|------|----------|--------|
| `languagePreference` | string | **yes** | `telugu` or `english` (also accepts `language`) |

Response:

```json
{
  "status": "Success",
  "message": "Daily promise activated. You will receive one promise card on WhatsApp every day at 12:00 AM (India time) in your selected language.",
  "data": {
    "dailyPromise": true,
    "languagePreference": "telugu",
    "schedule": "12:00 AM Asia/Kolkata",
    "cardsPerDay": 1,
    "cardLanguage": "telugu"
  }
}
```

**Requirements:** User account must be `active: true` (admin-enabled).

---

### 1.4 Deactivate daily promise

```http
POST /api/users/deactivate-daily-promise
Authorization: Bearer <token>
```

No body required.

Response:

```json
{
  "status": "Success",
  "message": "Daily promise deactivated. You will no longer receive WhatsApp cards.",
  "data": {
    "dailyPromise": false,
    "languagePreference": "telugu"
  }
}
```

---

### 1.5 Update subscription (optional)

Same as activate/deactivate in one call:

```http
PATCH /api/users/me/daily-promise
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled": true,
  "languagePreference": "telugu"
}
```

**UI suggestion:** Settings screen → language picker (Telugu / English) → **Activate** button calls `POST /activate-daily-promise`. Toggle OFF calls `POST /deactivate-daily-promise`.

---

## 2. View today’s promise in app (existing)

### 2.1 Full promise by date

```http
GET /api/promises/daily-promise-by-date?date=2026-05-21
```

Response:

```json
{
  "data": {
    "date": "2026-05-21",
    "text": "Call on Me, I will answer you.",
    "telugu": "నాకు మొఱ్ఱపెట్టుము...",
    "englishReference": "Jeremiah 33:3",
    "teluguReference": "యిర్మియా 33:3",
    "imageUrlEnglish": "https://res.cloudinary.com/.../en.png",
    "imageUrlTelugu": "https://res.cloudinary.com/.../te.png"
  }
}
```

Use `date` as `YYYY-MM-DD` (today in India: `Asia/Kolkata`).

### 2.2 Image + text by language

```http
GET /api/promises/daily-promise-image?date=2026-05-21&language=telugu
```

| Query | Values |
|-------|--------|
| `date` | `YYYY-MM-DD` |
| `language` | `english`, `en`, `telugu`, `te` |

Response:

```json
{
  "date": "2026-05-21",
  "language": "telugu",
  "imageUrl": "https://res.cloudinary.com/...",
  "reference": "యిర్మియా 33:3",
  "text": "నాకు మొఱ్ఱపెట్టుము..."
}
```

---

## 3. Admin APIs

### 3.1 List daily promise active users

Users who receive the **12 AM WhatsApp** (`active: true` and `dailyPromise: true`).

```http
GET /api/users/daily-promise-active?page=1&limit=20
Authorization: Bearer <admin_token>
```

**Count only** (no user list):

```http
GET /api/users/daily-promise-active?countOnly=true
Authorization: Bearer <admin_token>
```

Response (list):

```json
{
  "status": "Success",
  "data": [
    {
      "_id": "...",
      "mobile": "9876543210",
      "username": "9876543210@Holyspirit",
      "active": true,
      "dailyPromise": true,
      "languagePreference": "telugu",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "totalItems": 120,
    "currentPage": 1,
    "totalPages": 6,
    "pageSize": 20
  }
}
```

Response (count only):

```json
{
  "status": "Success",
  "data": {
    "totalActiveDailyPromiseUsers": 120
  }
}
```

### 3.2 List all users (existing)

```http
GET /api/users/getAll-users?page=1&limit=10
Authorization: Bearer <admin_token>
```

### 3.3 Toggle user active (existing)

```http
PATCH /api/auth/update-userstatus
Authorization: Bearer <admin_token>

{ "userId": "<mongo_id>", "status": true }
```

### 3.4 Set user daily promise subscription (admin)

```http
PATCH /api/users/daily-promise-subscription
Authorization: Bearer <admin_token>

{
  "userId": "<mongo_id>",
  "enabled": true,
  "languagePreference": "telugu"
}
```

### 3.5 Manually trigger WhatsApp broadcast (testing)

```http
POST /api/promises/broadcast-daily-now
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "date": "2026-05-21",
  "dryRun": false
}
```

| Field | Description |
|-------|-------------|
| `date` | Optional. Defaults to **today** (India timezone). |
| `dryRun` | `true` = count users only, do not call BhashSMS. |

Response:

```json
{
  "status": "Success",
  "data": {
    "ok": true,
    "broadcastDate": "2026-05-21",
    "totalSubscribers": 120,
    "sent": 118,
    "failed": 2,
    "skipped": 0,
    "errors": [{ "mobile": "98...", "error": "..." }]
  }
}
```

### 3.6 Broadcast delivery status

```http
GET /api/promises/broadcast-status?date=2026-05-21
Authorization: Bearer <admin_token>
```

### 3.7 Daily delivery report (admin dashboard)

How many messages were sent today, how many **activated** daily-promise users exist, and **per user** whether WhatsApp was delivered, failed, or still pending.

```http
GET /api/promises/daily-delivery-report?date=2026-06-01
Authorization: Bearer <admin_token>
```

| Query | Description |
|-------|-------------|
| `date` | Optional. `YYYY-MM-DD`. Defaults to **today** (India timezone). |

Response:

```json
{
  "status": "Success",
  "data": {
    "broadcastDate": "2026-06-01",
    "promiseExists": true,
    "promiseDate": "2026-06-01",
    "summary": {
      "activatedUsers": 5,
      "delivered": 4,
      "failed": 1,
      "pending": 0,
      "notAttempted": 0,
      "deliveryRatePercent": 80
    },
    "users": [
      {
        "userId": "683454599e1ca1e69e5e424a",
        "mobile": "+919966305528",
        "username": "9966305528@Holyspirit",
        "accountActive": true,
        "dailyPromiseActive": true,
        "languagePreference": "telugu",
        "deliveryStatus": "delivered",
        "delivered": true,
        "error": "",
        "providerResponse": "S.102356",
        "promiseDate": "2026-06-01",
        "imageUrl": "https://res.cloudinary.com/...",
        "attemptedAt": "2026-06-01T09:48:13.639Z"
      },
      {
        "userId": "...",
        "mobile": "9876543210",
        "deliveryStatus": "pending",
        "delivered": false,
        "error": "",
        "providerResponse": "",
        "attemptedAt": null
      }
    ]
  }
}
```

| `deliveryStatus` | Meaning |
|------------------|---------|
| `delivered` | WhatsApp sent successfully (`status: sent` in log) |
| `failed` | Send attempted but BhashSMS error |
| `pending` | Activated user, not yet delivered today |

`summary.activatedUsers` = users with `active: true` and `dailyPromise: true` (same list as 12 AM broadcast).

---

## 4. Automatic send at 12 AM

The server runs a cron job when it starts (no extra frontend action).

| Env variable | Default | Meaning |
|--------------|---------|---------|
| `DAILY_PROMISE_CRON` | `0 0 * * *` | 12:00 AM IST every day |
| `BHASHSMS_TIMEZONE` | `Asia/Kolkata` | Cron timezone |
| `ENABLE_DAILY_PROMISE_CRON` | enabled | Set `false` to disable |
| `DAILY_PROMISE_CATCHUP_DELAY_MS` | `5000` | On server start, retry today’s send if midnight was missed |

**Who receives WhatsApp (every day 12:00 AM IST):**

- `active: true` — admin-enabled account
- `dailyPromise: true` — user opted in
- valid `mobile` on file

Cron runs automatically while the backend is running. If the server was down at midnight, **catch-up** sends on next startup for anyone not yet marked `sent` today.

---

## 5. BhashSMS / WhatsApp template setup

Add to server `.env`:

```env
BHASHSMS_API_URL=http://bhashsms.com/api/sendmsgutil.php
BHASHSMS_USER=HolySpirit_BW
BHASHSMS_PASS=your_password
BHASHSMS_SENDER=BUZWAP
BHASHSMS_TEMPLATE_NAME=daily_card
BHASHSMS_SEND_PARAMS=false
BHASHSMS_PRIORITY=wa
BHASHSMS_STYPE=normal
BHASHSMS_DEFAULT_LANGUAGE=telugu
BHASHSMS_TIMEZONE=Asia/Kolkata
DAILY_PROMISE_CRON=0 0 * * *
BHASHSMS_SEND_DELAY_MS=400
```

**API:** `sendmsgutil.php` (activated WhatsApp image API). Phone is sent as **10 digits without +91**.

**Template `daily_card`:** image only — Cloudinary URL in `url`, no `Params` unless you set `BHASHSMS_SEND_PARAMS=true`.

| Param | Content (only if `BHASHSMS_SEND_PARAMS=true`) |
|-------|---------|
| param1 | Date (e.g. `21 May, 2026`) |
| param2 | Bible reference |
| param3 | Promise text (short) |

Image URL: Cloudinary promise card (`imageUrlEnglish` or `imageUrlTelugu`).

Success response example: `S.641`

**Troubleshooting (no WhatsApp at 12 AM):**

1. Server must be running at midnight IST, **or** it will auto-send on next startup (catch-up).
2. Check `GET /api/promises/broadcast-status` — `failed` entries show the BhashSMS error.
3. Use `sendmsgutil.php` (not `sendmsg.php`). If error is `API Not Activated`, the wrong endpoint or account may be in use.
4. Manual retry: `POST /api/promises/broadcast-daily-now` (admin JWT).

---

## 6. React Native example

```javascript
const API = 'http://YOUR_SERVER:5000';

// After login
async function activateDailyPromise(token, language = 'telugu') {
  const res = await fetch(`${API}/api/users/activate-daily-promise`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ languagePreference: language }),
  });
  return res.json();
}

async function deactivateDailyPromise(token) {
  const res = await fetch(`${API}/api/users/deactivate-daily-promise`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function getTodaysPromise(language = 'telugu') {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const res = await fetch(
    `${API}/api/promises/daily-promise-image?date=${today}&language=${language}`
  );
  return res.json();
}
```

---

## 7. Error codes

| HTTP | Meaning |
|------|---------|
| 400 | Missing/invalid body or query |
| 401 | Missing or invalid JWT |
| 403 | Admin-only route |
| 404 | No promise for date / user not found |
| 500 | Server or BhashSMS error |

---

## 8. Checklist for frontend

- [ ] After OTP login, call `GET /api/users/me`
- [ ] Show toggle bound to `dailyPromise`
- [ ] On activate → `POST /api/users/activate-daily-promise` with `languagePreference`
- [ ] On deactivate → `POST /api/users/deactivate-daily-promise`
- [ ] Language setting → same API with `languagePreference`
- [ ] Home screen → `GET /api/promises/daily-promise-image` with today’s date
- [ ] Admin panel → optional manual `broadcast-daily-now` for testing
