// C:\Users\munch\Desktop\MunchMtxi\clearCache.js
Object.keys(require.cache).forEach(key => delete require.cache[key]);
console.log('Cache cleared');
require('./server/server.js');