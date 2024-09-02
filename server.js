//Se importan las librerías, modulos y funciones necesarías.
const express = require('express');
// const mongoose = require('./db');
require('dotenv').config();
const placesRoutes = require('./routes/placesRoutes')
const app = express();

//Se habilita el manejo de información en onbjetos json
app.use(express.json());
//Se habilita el envio de datos en Formato URL-encoded desde Postman
app.use(express.urlencoded({ extended: true }));
//Se crea la ruta base y el router
app.use('/api/places', placesRoutes)
//Se establece un puerto base y uno alternativo
const port = process.env.PORT || 3000
//Se inicia el servidor
app.listen(port, () => {
  console.log(`Server running on port ${port}`); 
});