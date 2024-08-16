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
    .slice(0, 3); // Limitar a los primeros 10 resultados
};

const cleanText = (text) => {
  if (typeof text !== "string") {
    console.log(text);
    console.error("Expected a string as input");
  }

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const validationPlace = (name1, city1, country1, name2, city2, country2) => {
  if (
    cleanText(city1) === cleanText(city2) &&
    cleanText(country1) === cleanText(country2) &&
    cleanText(name1) === cleanText(name2)
  ) {
    return true;
  } else if (
    cleanText(name1).includes(name2) === true ||
    cleanText(name2).includes(name1) === true
  ) {
    return true;
  } else {
    return false;
  }
};

const getPlaceTripAvisor = async (name, city, country) => {

  const api_key = process.env.API_KEY_TA;
  const api_location_tripAdvisor = process.env.API_LOCATION_SEARCH_TA;
  const dominio = process.env.NOMBRE_DOMINIO;

  if (!name || !city || !country) {
    console.error("Please send all information");
  }
  const endpoint = api_location_tripAdvisor;
  const params = {
    key: api_key,
    searchQuery: name,
  };

  const headers = {
    origin: dominio,
    Referer: dominio, // Reemplaza con tu dominio autorizado
  };

  try {
    const response = await axios.get(endpoint, { params, headers });
    const places = Object.values(response.data).flat();
    for (const place of places) {
      if (place.name && place.address_obj.city && place.address_obj.country) {
        if (
          validationPlace(
            place.name,
            place.address_obj.city,
            place.address_obj.country,
            name,
            city,
            country
          )
        ) {
          getPlaceDetailsTripAdvisor(parseInt(place.location_id, 10));
        }
      }
    }

    // return place;
  } catch (error) {
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
    throw error; // Lanzar el error para manejarlo en otro lugar si es necesario
  }
};

const getPlaceDetailsTripAdvisor = async (id) => {
  const api_key = process.env.API_KEY_TA;
  const dominio = process.env.NOMBRE_DOMINIO;

  if (!id) {
    console.error("Please send id");
  }
  const endpoint = `https://api.content.tripadvisor.com/api/v1/location/${id}/details`;
  const params = {
    key: api_key,
  };

  const headers = {
    origin: dominio,
    Referer: dominio, // Reemplaza con tu dominio autorizado
  };

  try {
    const response = await axios.get(endpoint, { params, headers });
    const place = response.data;
    console.log(place);
    //     console.log(`
    // ${place.name}
    // ${place.description ? place.description : "description not available"}
    // ${place.latitude ? place.latitude : "Latitude not available"}
    // ${place.longitude ? place.longitude : "Longitude not available"}
    // ${place.amenities ? place.amenities : "Amenities not available"}
    //       `);
    // // ${
    //   place.hours.weekday_text
    //     ? place.hours.weekday_text
    //     : "Schedule not awailable"
    // }
    // place.trip_types.forEach((prop) => {
    //   console.log(prop.localized_name);
    // });
    // return place;
  } catch (error) {
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
  }
};

// Función para buscar lugares de un tipo específico (por ejemplo buscar tipo hoteles)
// getPlaceTripAvisor("Hotel Nutibara", "Medellín","Colombia");

module.exports = {
  placesDB,
  getPlaceTripAvisor,
  fetchPlacesByType,
};
