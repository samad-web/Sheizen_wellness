const crypto = require('crypto');
const curve = crypto.createECDH('prime256v1');
curve.generateKeys();
const publicKey = curve.getPublicKey('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const privateKey = curve.getPrivateKey('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fs = require('fs');
fs.writeFileSync('vapid-keys.txt', 'PUBLIC=' + publicKey + '\nPRIVATE=' + privateKey + '\n');
console.log('Keys written to vapid-keys.txt');
