# TargheApp 🚗

App mobile-first per fotografare e registrare targhe di auto. Ogni utente può inserire massimo 3 targhe al giorno — vince chi trova l'auto con l'anno di immatricolazione più recente.

## Stack

- **Next.js 14** (App Router + TypeScript)
- **Tailwind CSS** + animazioni Framer Motion
- **Supabase** — PostgreSQL + Storage per le foto
- **Prisma** — ORM
- **NextAuth.js** — autenticazione email/password

---

## Setup

### 1. Installa Node.js

Scarica e installa Node.js (versione 18+) da: https://nodejs.org

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Crea il progetto Supabase

1. Vai su https://supabase.com e crea un nuovo progetto
2. Vai su **Settings → API** e copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Vai su **Settings → Database** e copia la connection string

### 4. Crea il bucket Storage

Nel pannello Supabase, vai su **Storage** e crea un bucket chiamato `plate-photos` con accesso **pubblico**.

### 5. Configura le variabili d'ambiente

Copia `.env.local` e compila con i tuoi valori:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

NEXTAUTH_SECRET=genera_con_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

Per generare `NEXTAUTH_SECRET`:
```bash
# Su Mac/Linux:
openssl rand -base64 32

# Su Windows PowerShell:
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 6. Inizializza il database

```bash
npm run db:generate
npm run db:push
```

### 7. Avvia l'app

```bash
npm run dev
```

Apri http://localhost:3000

---

## Funzionalità

- 📸 **Scansione targa** — foto obbligatoria con la fotocamera del dispositivo
- 🏆 **Classifica giornaliera** — vince chi trova l'auto con l'anno più recente
- ⏱️ **Countdown** — timer fino alla fine della giornata
- 🎖️ **Badge** — premi per traguardi speciali
- 📊 **Statistiche** — targhe totali, vittorie, streak
- 🌙 **Dark mode** — interfaccia scura ottimizzata per mobile

## Badge disponibili

| Badge | Come ottenerlo |
|-------|---------------|
| 🚗 Prima targa | Inserisci la tua prima targa |
| 🏆 Vincitore del giorno | Vinci la classifica giornaliera |
| 🔥 3 vittorie di fila | Vinci 3 giorni consecutivi |
| ⚡ 7 vittorie di fila | Vinci 7 giorni consecutivi |
| ⏰ Cacciatore vintage | Trova un'auto ante 1980 |
| ⭐ Collezionista | Inserisci 50 targhe totali |

## Cron job (vincitore giornaliero)

Per assegnare automaticamente il vincitore a mezzanotte, configura un cron job che chiama:

```
POST /api/cron/daily-winner
Authorization: Bearer {CRON_SECRET}
```

Su Vercel puoi usare **Vercel Cron Jobs** nel file `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/daily-winner",
    "schedule": "0 0 * * *"
  }]
}
```
