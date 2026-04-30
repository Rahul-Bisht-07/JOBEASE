const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_HEX = process.env.NAUKRI_ENCRYPTION_KEY || '';

function getKey() {
  if (!KEY_HEX || KEY_HEX.length < 32) {
    throw new Error('NAUKRI_ENCRYPTION_KEY must be at least 32 characters in .env');
  }
  // Use first 32 bytes of the key
  return Buffer.from(KEY_HEX.slice(0, 32), 'utf8');
}

/**
 * Encrypt plaintext → returns "iv:encrypted" string
 */
function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt "iv:encrypted" string → plaintext
 */
function decrypt(encryptedString) {
  const [ivHex, dataHex] = encryptedString.split(':');
  if (!ivHex || !dataHex) throw new Error('Invalid encrypted string format');
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
