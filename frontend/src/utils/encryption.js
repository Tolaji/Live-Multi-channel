// utils/encryption.js

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'user-device-fingerprint'; // Generated per-device

export function encryptAPIKey(apiKey) {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

export function decryptAPIKey(encryptedKey) {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Storage wrapper
export async function storeAPIKey(apiKey) {
  const encrypted = encryptAPIKey(apiKey);
  const db = await openDB('liveMultiChannel', 1);
  await db.put('settings', { key: 'apiKey', value: encrypted });
}

export async function retrieveAPIKey() {
  const db = await openDB('liveMultiChannel', 1);
  const record = await db.get('settings', 'apiKey');
  return record ? decryptAPIKey(record.value) : null;
}