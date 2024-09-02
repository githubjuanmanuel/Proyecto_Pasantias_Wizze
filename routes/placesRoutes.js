//Se importan las librerías, modulos y funciones necesarías.
const express = require('express');
const router = express.Router();
const { getPlaces } = require('../controllers/placesController');

//Se crea la ruta para obtener la información de los lugares y guardala en la base de datos
router.get('/', getPlaces);

module.exports = router;