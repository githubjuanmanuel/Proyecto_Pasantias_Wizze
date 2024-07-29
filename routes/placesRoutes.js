const express = require('express');
const router = express.Router();
const { getPlaces } = require('../controllers/placesController');

//Ruta para obtener la información de los lugares
router.get('/', getPlaces);

module.exports = router;