// Reusable App Store Connect API helper for Prompterly.
// Usage: node scripts/asc.mjs <command> [args]
//   state                 - app version + build + subscription status
//   attach <buildId>      - attach a build to the editable 1.0.0 version
//   builds                - list recent builds (processing state)
//
// Env / constants:
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

const KEY_PATH = process.env.ASC_KEY_PATH || 'C:/Users/13219/Downloads/AuthKey_YRMDQTX998.p8';
const KEY_ID = 'YRMDQTX998';
const ISSUER = 'b7b9dd56-d867-4b33-b6e0-21e133f8bf12';
const APP_ID = '6775036750'; // Prompterly
const BASE = 'https://api.appstoreconnect.apple.com';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Convert DER ECDSA signature -> JOSE raw r||s (64 bytes for P-256)
function derToJose(der) {
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;
  // r
  if (der[offset] !== 0x02) throw new Error('bad der');
  let rLen = der[offset + 1];
  let r = der.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  // s
  if (der[offset] !== 0x02) throw new Error('bad der');
  let sLen = der[offset + 1];
  let s = der.slice(offset + 2, offset + 2 + sLen);
  const pad = (b) => {
    b = Buffer.from(b);
    if (b.length > 32) b = b.slice(b.length - 32);
    if (b.length < 32) b = Buffer.concat([Buffer.alloc(32 - b.length), b]);
    return b;
  };
  return Buffer.concat([pad(r), pad(s)]);
}

function token() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = readFileSync(KEY_PATH, 'utf8');
  const der = crypto.sign('SHA256', Buffer.from(signingInput), { key, dsaEncoding: 'der' });
  const sig = b64url(derToJose(der));
  return `${signingInput}.${sig}`;
}

async function api(method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : `${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${method} ${path}`);
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return json;
}

async function getEditableVersion() {
  const v = await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState,appVersionState`);
  return v.data || [];
}

async function cmdState() {
  console.log('=== App Store Versions ===');
  const versions = await getEditableVersion();
  for (const ver of versions) {
    const a = ver.attributes;
    console.log(`  ${ver.id}  v${a.versionString}  state=${a.appStoreState || a.appVersionState}`);
    // attached build
    const b = await api('GET', `/v1/appStoreVersions/${ver.id}/build?fields[builds]=version,processingState`);
    if (b.data) console.log(`     build attached: ${b.data.id} (v${b.data.attributes?.version}, ${b.data.attributes?.processingState})`);
    else console.log('     build attached: NONE');
  }

  console.log('\n=== Subscriptions (groups) ===');
  const groups = await api('GET', `/v1/apps/${APP_ID}/subscriptionGroups?include=subscriptions&limit=10`);
  const subs = (groups.included || []).filter((x) => x.type === 'subscriptions');
  for (const s of subs) {
    console.log(`  ${s.id}  ${s.attributes.productId}  "${s.attributes.name}"  state=${s.attributes.state}`);
  }

  console.log('\n=== Recent builds ===');
  const builds = await api('GET', `/v1/builds?filter[app]=${APP_ID}&limit=5&sort=-uploadedDate&fields[builds]=version,processingState,uploadedDate`);
  for (const bd of builds.data || []) {
    console.log(`  ${bd.id}  v${bd.attributes.version}  ${bd.attributes.processingState}  ${bd.attributes.uploadedDate}`);
  }
}

async function cmdBuilds() {
  const builds = await api('GET', `/v1/builds?filter[app]=${APP_ID}&limit=10&sort=-uploadedDate&fields[builds]=version,processingState,uploadedDate`);
  for (const bd of builds.data || []) {
    console.log(`${bd.id}  v${bd.attributes.version}  ${bd.attributes.processingState}  ${bd.attributes.uploadedDate}`);
  }
}

async function cmdAttach(buildId) {
  if (!buildId) { console.error('usage: attach <buildId>'); process.exit(1); }
  const versions = await getEditableVersion();
  // pick the editable 1.0.0 (PREPARE_FOR_SUBMISSION / DEVELOPER_REJECTED / REJECTED)
  const editable = versions.find((v) => ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(v.attributes.appStoreState || v.attributes.appVersionState)) || versions[0];
  console.log(`Attaching build ${buildId} -> version ${editable.id} (v${editable.attributes.versionString})`);
  await api('PATCH', `/v1/appStoreVersions/${editable.id}/relationships/build`, { data: { type: 'builds', id: buildId } });
  console.log('OK attached.');
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'state') await cmdState();
else if (cmd === 'builds') await cmdBuilds();
else if (cmd === 'attach') await cmdAttach(arg);
else { console.log('commands: state | builds | attach <buildId>'); }
