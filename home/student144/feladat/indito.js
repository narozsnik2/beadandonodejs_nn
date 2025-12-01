const express = require('express');
const app = express();
const path = require('path');

// Statikus fájlok
app.use(express.static(path.join(__dirname, 'public')));


app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'ejs');

// Fő oldal
app.get('/', (req, res) => res.render('index'));

app.get('/contact', (req, res) => res.render('contact'));
app.post('/contact', (req, res) => {
  
});

// app.get('/messages', isLoggedIn, (req, res) => {
 
// });





const PORT = 4145;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});