const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('Customer123!', 10));