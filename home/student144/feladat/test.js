const db = require('./db');

db.query('SELECT * FROM pizza', (err, results) => {
  if (err) {
    console.error('Hiba a lekérdezésnél:', err.message);
  } else {
    console.log(results);
    
  }
});