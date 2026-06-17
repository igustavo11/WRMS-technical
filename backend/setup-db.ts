// @ts-ignore - mssql has no type declarations
import sql from 'mssql'

const dbUrl = process.env.DATABASE_URL!
const parts = dbUrl.replace('sqlserver://', '').split(';')
const first = parts[0]
if (!first) {
  console.error('Invalid DATABASE_URL')
  process.exit(1)
}
const [host, portStr = '1433'] = first.split(':')
const port = Number(portStr)

const params: Record<string, string> = {}
for (const part of parts.slice(1)) {
  const idx = part.indexOf('=')
  if (idx > 0) {
    params[part.slice(0, idx)] = part.slice(idx + 1)
  }
}

const dbName = params.database || 'wrms'

const pool = await sql.connect({
  server: host,
  port,
  user: params.user || 'sa',
  password: params.password || '',
  options: {
    database: 'master',
    encrypt: params.encrypt !== 'false',
    trustServerCertificate: true,
    connectTimeout: 15000,
  },
})

await pool.request().query(`
  IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName.replace(/'/g, "''")}')
  CREATE DATABASE [${dbName.replace(/]/g, ']]')}]
`)

await pool.close()
console.log(`Database "${dbName}" ready`)
