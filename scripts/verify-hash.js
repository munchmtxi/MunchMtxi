const bcrypt = require('bcryptjs');

(async () => {
  const hash = '$2a$10$xqvH44ezs/RSOa8hw.SHVOeeoHe5kTVb5/teElpgQtjqLyQCpUaGa';
  const match = await bcrypt.compare('Maria2403', hash);
  console.log('Password match:', match); // Expect false
})();
