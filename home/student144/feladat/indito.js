const express = require('express');
const app = express();
const path = require('path');
const db = require('./db');
const session = require('express-session');

// Statikus fájlok
app.use(express.static(path.join(__dirname, 'public')));


app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'ejs');




app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'abcd4321',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 }
}));

app.use((req, res, next) => {
  const kategoriaQuery = 'SELECT nev FROM kategoria ORDER BY nev';
  const vegetarQuery = "SELECT nev FROM pizza WHERE vegetarianus = '1' ORDER BY nev";

  db.query(kategoriaQuery, (err, kategorias) => {
    if (err) return next(err);

    db.query(vegetarQuery, (err2, vegetaris) => {
      if (err2) return next(err2);

     
      res.locals.kategorias = kategorias;
      res.locals.vegetaris = vegetaris;

      next();
    });
  });
});


app.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [name, email, subject, message, created_at]
    );

    res.send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=/contact" />
        </head>
        <body style="font-family:sans-serif; text-align:center; padding-top:50px;">
          <h1>Köszönjük, az üzeneted elküldve!</h1>
          <p>3 másodperc múlva visszairányítunk a kapcsolati oldalra.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Hiba történt az üzenet mentésekor.');
  }
});

app.get('/contact', (req, res) => res.render('contact'));

app.get('/', (req, res, next) => {
  const pizzaQuery = 'SELECT * FROM pizza ORDER BY nev';
  const popularQuery = `
    SELECT p.nev, p.kategorianev, p.vegetarianus, k.ar, SUM(r.darab) AS total_ordered
    FROM pizza p
    JOIN rendeles r ON p.nev = r.pizzanev
    JOIN kategoria k ON p.kategorianev = k.nev
    GROUP BY p.nev, p.kategorianev, p.vegetarianus, k.ar
    ORDER BY total_ordered DESC
    LIMIT 10
  `;

  db.query(pizzaQuery, (err, pizzas) => {
    if (err) return next(err);

    db.query(popularQuery, (err2, popularPizzas) => {
      if (err2) return next(err2);

      res.render('index', { pizzas, popularPizzas });
    });
  });
});

app.get('/pizzak', (req, res) => {
  db.query('SELECT * FROM kategoria', (err, kategorias) => {
    if (err) return next(err);

    const pizzasByCategory = {};
    let counter = 0;


    kategorias.forEach(kat => {
      db.query('SELECT * FROM pizza WHERE kategorianev = ?', [kat.nev], (err2, pizzas) => {
        if (err2) return next (err2);

        pizzasByCategory[kat.nev] = pizzas;
        counter++;

 
        if (counter === kategorias.length) {

  
          const popularQuery = `
            SELECT p.nev, p.kategorianev, p.vegetarianus, k.ar, SUM(r.darab) AS total_ordered
            FROM pizza p
            JOIN rendeles r ON p.nev = r.pizzanev
            JOIN kategoria k ON p.kategorianev = k.nev
            GROUP BY p.nev, p.kategorianev, p.vegetarianus, k.ar
            ORDER BY total_ordered DESC
            LIMIT 10
          `;

          db.query(popularQuery, (err3, popularPizzas) => {
            if (err3) return next (err3);

            res.render('pizzak', { kategorias, pizzasByCategory, popularPizzas });
          });

        }
      });
    });

  });
});

// app.get('/messages', isLoggedIn, (req, res) => {
 
// });

app.get('/about', (req, res) => {
  res.render('about')
});

app.get('/kategoria/:nev', (req, res) => {
  const kategoriaNev = req.params.nev;

  const query = `
    SELECT p.nev, p.vegetarianus, k.ar
    FROM pizza p
    JOIN kategoria k ON p.kategorianev = k.nev
    WHERE p.kategorianev = ?
    ORDER BY p.nev ASC
  `;

  const popularQuery = `
  SELECT p.nev, p.kategorianev, p.vegetarianus, k.ar, SUM(r.darab) AS total_ordered
  FROM pizza p
  JOIN rendeles r ON p.nev = r.pizzanev
  JOIN kategoria k ON p.kategorianev = k.nev
  GROUP BY p.nev, p.kategorianev, p.vegetarianus, k.ar
  ORDER BY total_ordered DESC
  LIMIT 10
`;

db.query(query, [kategoriaNev], (err, pizzas) => {
  if (err) return next(err);

  db.query(popularQuery, (err2, popularPizzas) => {
    if (err2) return next (err2);

    res.render('kategoria', { pizzas, kategoriaNev, popularPizzas });
  });
});
});


app.get('/kosar', (req, res) => {
  const kosar = req.session.kosar || [];
  res.render('kosar', { kosar });
});


app.post('/kosar', (req, res) => {
  const { pizzanev, darab } = req.body;

  if (!req.session.id) {
    req.session.id = 'guest_' + Math.floor(Math.random() * 1000000);
  }

  if (!req.session.kosar) req.session.kosar = [];

  const index = req.session.kosar.findIndex(p => p.pizzanev === pizzanev);
  if (index !== -1) {
    req.session.kosar[index].darab += parseInt(darab);
  } else {
    req.session.kosar.push({ pizzanev, darab: parseInt(darab) });
  }

  res.redirect('/kosar');
});


app.post('/kosar/update', (req, res) => {
  const { index, action } = req.body;
  if (!req.session.kosar) req.session.kosar = [];
  const i = parseInt(index);

  if (action === 'plus') req.session.kosar[i].darab += 1;
  if (action === 'minus' && req.session.kosar[i].darab > 1) req.session.kosar[i].darab -= 1;

  res.redirect('/kosar');
});


app.post('/kosar/delete', (req, res) => {
  const { index } = req.body;
  if (!req.session.kosar) req.session.kosar = [];
  req.session.kosar.splice(parseInt(index), 1);
  res.redirect('/kosar');
});



app.post('/kosar/checkout', (req, res) => {

  if (!req.session.kosar || req.session.kosar.length === 0) {
    return res.send("A kosár üres.");
  }

  const rendelesek = req.session.kosar;


  const now = new Date();
  const mysqlDatetime = now.toISOString().slice(0, 19).replace('T', ' ');

  const sql = "INSERT INTO rendeles (pizzanev, darab, felvetel) VALUES ?";


  const values = rendelesek.map(item => [
    item.pizzanev,
    item.darab,
    mysqlDatetime
  ]);

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Hiba rendelés mentésekor:", err);
      return res.send("Hiba történt a rendelés mentésekor!");
    }


    req.session.kosar = [];


    res.send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=/" />
        </head>
        <body style="font-family: sans-serif; text-align:center; padding-top:50px;">
          <h1>Rendelés leadva! Köszönjük!</h1>
          <p>A rendelés sikeresen bekerült az adatbázisba.</p>
        </body>
      </html>
    `);
  });

});

app.get('/search', (req, res) => {
  const q = req.query.q;
  if (!q || q.trim() === '') return res.json([]);

  const sql = "SELECT nev FROM pizza WHERE nev LIKE ? LIMIT 10";
  const param = `%${q}%`;

  db.query(sql, [param], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});

app.post('/kosar/add-ajax', express.json(), (req, res) => {
  const { pizzanev, darab } = req.body;

  if (!req.session.kosar) req.session.kosar = [];

  const index = req.session.kosar.findIndex(p => p.pizzanev === pizzanev);
  if (index !== -1) {
    req.session.kosar[index].darab += darab;
  } else {
    req.session.kosar.push({ pizzanev, darab });
  }

  res.json(req.session.kosar);
});



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Valami hiba történt!');
});

const PORT = 4145;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});