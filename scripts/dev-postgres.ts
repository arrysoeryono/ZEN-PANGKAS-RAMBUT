import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Postgres portabel untuk pengembangan lokal (tanpa Docker/root).
 * - Unduhan sekali: binari PostgreSQL 17 (Zonky, dari Maven Central) ke .local-pg/
 * - Data cluster: .local-pg/data (jangan di-commit)
 * Jalur cepat: bun run dev:db  →  DATABASE_URL=postgresql://postgres@localhost:5433/zenpangkas
 */

const ROOT = path.resolve(process.cwd())
const PG_DIR = path.join(ROOT, '.local-pg')
const BIN = path.join(PG_DIR, 'bin')
const DATA = path.join(PG_DIR, 'data')
const PORT = 5433
const DB_NAME = 'zenpangkas'
const VERSION = '17.4.0'

async function downloadBinaries() {
  if (existsSync(path.join(BIN, 'postgres'))) return
  console.log('Mengunduh binari PostgreSQL (sekali saja, ~15 MB)...')
  mkdirSync(PG_DIR, { recursive: true })
  const jarPath = path.join(PG_DIR, 'pg.jar')
  const jarRes = await fetch(
    `https://repo1.maven.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-linux-amd64/${VERSION}/embedded-postgres-binaries-linux-amd64-${VERSION}.jar`,
  )
  if (!jarRes.ok) throw new Error(`Gagal mengunduh binari (HTTP ${jarRes.status})`)
  writeFileSync(jarPath, Buffer.from(await jarRes.arrayBuffer()))
  execSync(
    `cd "${PG_DIR}" && unzip -o -q pg.jar && tar -xJf postgres-linux-x86_64.txz && rm -f pg.jar postgres-linux-x86_64.txz`,
  )
  console.log('Binari siap.')
}

async function sh(cmd: string, args: string[]): Promise<void> {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))))
    child.on('error', reject)
  })
}

function psql(cmd: string): void {
  const psqlBin = path.join(BIN, 'psql')
  execSync(`"${psqlBin}" -h localhost -p ${PORT} -U postgres -c "${cmd}"`, {
    env: { ...process.env, PGCONNECT_TIMEOUT: '5' },
    stdio: 'ignore',
  })
}

async function main() {
  await downloadBinaries()

  const firstTime = !existsSync(path.join(DATA, 'PG_VERSION'))
  if (firstTime) {
    console.log('Inisialisasi cluster data baru...')
    await sh(path.join(BIN, 'initdb'), [
      '-D',
      DATA,
      '-U',
      'postgres',
      '-E',
      'UTF8',
      '--auth=trust',
      '-A',
      'trust',
    ])
  }

  // start (idempotent)
  try {
    execSync(`"${path.join(BIN, 'pg_ctl')}" -D "${DATA}" status`, { stdio: 'ignore' })
    console.log('PostgreSQL sudah berjalan.')
  } catch {
    console.log(`Menjalankan PostgreSQL di localhost:${PORT}...`)
    await sh(path.join(BIN, 'pg_ctl'), [
      '-D',
      DATA,
      '-l',
      path.join(PG_DIR, 'pg.log'),
      '-o',
      `-p ${PORT} -k /tmp`,
      'start',
    ])
  }

  console.log(`Siap! DATABASE_URL=postgresql://postgres@localhost:${PORT}/postgres`)
  process.exit(0)
}

function psql(_cmd: string): void {
  // binari Zonky ter-strip (tanpa psql); database default "postgres" dipakai langsung
  void _cmd
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
