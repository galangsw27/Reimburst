import { pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { randomBytes } from 'crypto';

const pbkdf2Async = promisify(pbkdf2);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await pbkdf2Async(password, salt, 10000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

// Generate hash for "password123"
const hash = await hashPassword('password123');
console.log('Password hash for "password123":');
console.log(hash);
