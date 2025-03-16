const jwt = require('jsonwebtoken');

const secret = 'afe4137b5164670330edad6f789cc400fec0c8ff70631d2de2820b59bcc537a8';
const payload = { id: 43, role: 19 };
const options = { expiresIn: '7d' };

const token = jwt.sign(payload, secret, options);
console.log('New Token:', token);