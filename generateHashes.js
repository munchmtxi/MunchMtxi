const bcrypt = require('bcryptjs');
(async () => {
  const hash = await bcrypt.hash('P@ssw0rd123!', 10);
  console.log(hash);
})();