const bcrypt = require('bcryptjs');

const passwords = ['Rider789$', 'Delivery2023!', 'Clerk101@', 'Manager555#'];

async function generateHashes() {
  for (const password of passwords) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}\n`);
  }
}

generateHashes().catch(err => console.error(err));