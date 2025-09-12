const bcrypt = require('bcrypt');

async function createAdmin() {
  const password = 'sebas2003'; // cambia esto
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
}

createAdmin();