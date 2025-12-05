
const mysql = require('mysql2');

const db = mysql.createConnection({
 host : '143.47.98.96',
 user : 'studb145',
 port: 3306,
 password : 'abc123',
 database : 'db145'
});


db.connect(err => {
    if (err) {
      console.error('Error connecting database:', err.message);
    } else {
      console.log('Kapcsolódva az adatbázishoz!');
    }
  });

module.exports = db;
