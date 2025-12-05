const express = require('express');
const app = express();
const path = require('path');
const db = require('./db');
const session = require('express-session');
const bcrypt = require('bcryptjs');

app.use(express.json());

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
  res.locals.userId = req.session.userId || null;
  res.locals.username = req.session.username || null;
  res.locals.isAdmin = req.session.isAdmin || 0;
  next();
});

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
    db.query(
      'INSERT INTO contact_messages (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [name, email, subject, message, created_at],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Hiba történt az üzenet mentésekor.');
        }
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
      }
    );
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

app.get('/pizzak', (req, res, next) => {
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



app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send('Minden mezőt ki kell tölteni');
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, email, hash) VALUES (?, ?, ?)';
db.query(sql, [username, email, hashedPassword], (err, result) => {
  if (err) return res.status(500).send('Hiba a regisztráció során');
  res.redirect('/login');
});
  } catch (err) {
    console.error(err);
    res.status(500).send('Hiba a regisztráció során');
  }
});




app.get('/register', (req, res) => {
  res.render('register');
});





app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) return res.status(500).send("Hiba történt");
      if (results.length === 0) return res.status(401).send("Nincs ilyen felhasználó");

      const user = results[0];
      const isValid = await bcrypt.compare(password, user.hash); // hash oszlop

      if (!isValid) return res.status(401).send("Helytelen jelszó");

   
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.isAdmin === 1 ? 1 : 0;

      res.send("Sikeres bejelentkezés!");
    }
  );
});


app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Hiba történt a kilépés során");
    res.redirect('/');
  });
});

function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(403).send("Nincs jogosultságod");
}


app.get('/admin', isAdmin, (req, res) => {
  res.redirect('/admin/orders?page=1');
});

app.get('/admin/orders', isAdmin, (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const countQuery = 'SELECT COUNT(*) AS total FROM rendeles';
  const dataQuery = `
      SELECT r.az, r.pizzanev, r.darab, r.felvetel
      FROM rendeles r
      ORDER BY r.felvetel DESC
      LIMIT ? OFFSET ?
  `;

  db.query(countQuery, (err, countResult) => {
      if (err) return next(err);

      const totalOrders = countResult[0].total;
      const totalPages = Math.ceil(totalOrders / limit);

      db.query(dataQuery, [limit, offset], (err2, orders) => {
          if (err2) return next(err2);

          res.render('admin_orders', { orders, page, totalPages });
      });
  });
});



app.post('/admin/orders/delete', isAdmin, (req, res, next) => {
  const { id } = req.body;

  db.query('DELETE FROM rendeles WHERE az = ?', [id], (err, result) => {
      if (err) return next(err);
      res.redirect('/admin/orders');
  });
});




app.get('/admin/orders/edit/:id', isAdmin, (req, res, next) => {
  const { id } = req.params;

  db.query('SELECT * FROM rendeles WHERE az = ?', [id], (err, results) => {
      if (err) return next(err);
      if (results.length === 0) return res.send("Nincs ilyen rendelés");

      res.render('admin_edit_order', { order: results[0] });
  });
});





app.post('/admin/orders/edit/:id', isAdmin, (req, res, next) => {
  const { id } = req.params;
  const { pizzanev, darab } = req.body;

  db.query('UPDATE rendeles SET pizzanev = ?, darab = ? WHERE az = ?', [pizzanev, darab, id], (err, result) => {
      if (err) return next(err);
      res.redirect('/admin/orders');
  });
});





app.get('/admin/contact', isAdmin, (req, res, next) => {
  const query = 'SELECT id, name, email, subject, message, created_at FROM contact_messages ORDER BY created_at DESC';
  
  db.query(query, (err, messages) => {
    if (err) return next(err);

    res.render('admin_contact', { messages });
  });
});







app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Valami hiba történt!');
});

const PORT = 4145;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});