import assert from 'node:assert/strict'
import test from 'node:test'
import { importJobFromUrl } from '../server/job-import.js'

const blocked = (url) => assert.rejects(
  () => importJobFromUrl(url),
  (error) => ['INVALID_URL', 'BLOCKED_URL'].includes(error?.code),
)

test('jobbimport avviser andre protokoller og URL-legitimasjon', async () => {
  await blocked('file:///etc/passwd')
  await blocked('https://user:password@example.com/job')
})

test('jobbimport avviser localhost og private IPv4-adresser', async () => {
  await blocked('http://localhost/job')
  await blocked('http://127.0.0.1/job')
  await blocked('http://10.0.0.1/job')
  await blocked('http://169.254.169.254/latest/meta-data')
  await blocked('http://192.168.1.20/job')
})

test('jobbimport avviser private IPv6-adresser og egendefinerte porter', async () => {
  await blocked('http://[::1]/job')
  await blocked('http://[fd00::1]/job')
  await blocked('https://example.com:8443/job')
})
