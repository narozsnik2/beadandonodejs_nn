const express = require('express');
const app = express();
const path = require('path');
const db = require('./db');

// Statikus fájlok
app.use(express.static(path.join(__dirname, 'public')));


app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'ejs');

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

app.get('/contact', (req, res) => res.render('contact'));

app.get('/', (req, res) => {
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
    if (err) throw err;

    db.query(popularQuery, (err2, popularPizzas) => {
      if (err2) throw err2;

      res.render('index', { pizzas, popularPizzas });
    });
  });
});

app.get('/pizzak', (req, res) => {
  const pizzaQuery = 'SELECT * FROM pizza ORDER BY nev';

  db.query(pizzaQuery, (err, pizzas) => {
    if (err) throw err;
    res.render('pizzak', { 
      pizzas
    });
  });
});


// app.get('/messages', isLoggedIn, (req, res) => {
 
// });





const PORT = 4145;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});