const axios = require("axios");

//Se importa el modelo creado
const { createPlace } = require("../models/placeModel");
const { query } = require("express");

const placesDB = async (places) => {
  for (const place of places) {
    const placeExist = await Place.findOne({ address: place.address });

    console.log(place.description);

    if (placeExist) {
      // console.log('place exist');
      continue;
    }

    try {
      const newPlace = await Place.create({
        name: place.name,
        address: place.address,
        rating: place.rating.toString(),
        description: place.description,
        type: place.type,
      });
      console.log("New place added to db");
    } catch (error) {
      console.log(error);
    }
  }
};

const fetchPlacesByType = async (type, locationStr) => {
  const api_nearby_search = process.env.API_NEARBY_SEARCH;
  const response = await axios.get(api_nearby_search, {
    params: {
      location: locationStr, //Cordenadas
      radius: 5000, // Radio de búsqueda en metros
      type: type, //tipo de ubicación
      key: process.env.API_KEY,
    },
  });
  return response.data.results
    .filter((place) => place.rating >= 4)
    .sort((a, b) => a - b)
    .slice(0, 10); // Limitar a los primeros 10 resultados
};

const cleanText = (text) => {
  if (typeof text !== 'string') {
    throw new TypeError('Expected a string as input');
  }
  
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const getComponents = (name, lat, long ,city, country ) => {

}


const getPlaceTripAvisor = async ( name, city, country ) => {
  const api_key = process.env.API_KEY_TA;
  const api_location_tripAdvisor = process.env.API_LOCATION_SEARCH_TA;
  const dominio = process.env.NOMBRE_DOMINIO;

if (!name || !city || !country) {
  throw new TypeError('Please send all information');
}
  const endpoint = api_location_tripAdvisor;
  const params = {
    key: api_key,
    searchQuery: name
  };

  const headers = {
    origin: dominio,
    Referer: dominio, // Reemplaza con tu dominio autorizado
  };

  axios
    .get(endpoint, { params, headers })
    .then((response) => {
      const places = Object.values(response.data)
        .flat()
        .filter(
          (place) => console.log(place.address_obj.city) &&
          cleanText(place.name) === cleanText(name) &&
          cleanText(place.address_obj.city) === cleanText(city) &&
          cleanText(place.country) === cleanText(country)
        );
      console.log(places); 
    })
    .catch((error) => {
      console.error(
        "Error al hacer la solicitud a la API de TripAdvisor:",
        error.message
      );
    });
};

const getPlaceDetailsTripAdvisor = async (id) => {};

// Función para buscar lugares de un tipo específico (por ejemplo buscar tipo hoteles)
// getPlaceTripAvisor("Hotel Nutibara", "Medellín","Colombia");

module.exports = {
  placesDB,
  getPlaceTripAvisor,
  fetchPlacesByType,
};
