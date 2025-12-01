/*


const http = require('http');
const mysql = require('mysql2');

const PORT = 4151;

const server = http.createServer((req, res) => {
 
  if (req.url === '/') {
    dbQuery((html) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.write(html);
      res.end();
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


function dbQuery(callback) {
  const connection = mysql.createConnection({
    host: '143.47.98.96',
    user: 'studb145',
    port: 3306,
    password: 'abc123',
    database: 'db145'
  });

  connection.connect((err) => {
    if (err) {
      callback('<h1>Hiba az adatbázis kapcsolódásnál</h1>');
      return;
    }

    connection.query('SELECT * FROM pizza', (err, results) => {
      if (err) {
        callback('<h1>Hiba a lekérdezésnél</h1>');
        connection.end();
        return;
      }

      let html = '<h1>Pizzák listája</h1><ul>';
      if (results.length > 0) {
        results.forEach(pizza => {
          html += `<li>${pizza.nev} - Kategória: ${pizza.kategorianev} - Vegetarianus: ${pizza.vegetarianus ? 'igen' : 'nem'}</li>`;
        });
      } else {
        html += '<li>Nincs megjeleníthető pizza.</li>';
      }
      html += '</ul>';

      callback(html);
      connection.end();
    });
  });
}


*/