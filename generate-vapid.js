
import crypto from 'crypto';

// Generate VAPID keys
const curve = crypto.createECDH('prime256v1');
curve.generateKeys();

const publicKey = curve.getPublicKey('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const privateKey = curve.getPrivateKey('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

console.log('Public Key:', publicKey);
console.log('Private Key:', privateKey);
