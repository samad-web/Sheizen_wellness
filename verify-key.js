
const key = "BKbNBg2FSUHZhfEJTfzFTUcoDRfqKHr5x5gQSDsTczmFv2-z1KZj0lVYv71ozBxKDcUwaX9vHm4pXIgxRFQ1dxs";
const padding = '='.repeat((4 - key.length % 4) % 4);
const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');
const buf = Buffer.from(base64, 'base64');

console.log("Key Length:", buf.length);
console.log("Is 65 bytes?", buf.length === 65);
console.log("Bytes:", JSON.stringify([...buf]));
