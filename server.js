const express = require('express');
// const mongoose = require('./db');
require('dotenv').config();
const placesRoutes = require('./routes/placesRoutes')
const app = express();

//Habilita el manejo de información en onbjetos json
app.use(express.json());
//Habilita el envio de datos en Formato URL-encoded desde Postman
app.use(express.urlencoded({ extended: true }));
//se crea la ruta base y el router
app.use('/api/places', placesRoutes)

const port = process.env.PORT || 3000
//Se inicia el servidor
app.listen(port, () => {
  console.log(`Server running on port ${port}`); 
});