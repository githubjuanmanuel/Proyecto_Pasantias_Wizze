const axios = require("axios");
const { DynamoDBClient, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const generarId = () => {
  const random= Math.random().toString(36);
  const fecha = Date.now().toString(36);

  return random + fecha
}

const placesDB = async (places) => {

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
    .filter((place) => place.rating >= 4 && place.types.includes(type))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10); // Limitar a los primeros 10 resultados
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
  const nameIncluded1 = cleanText(name1).includes(cleanText(name2));
  const nameIncluded2 = cleanText(name2).includes(cleanText(name1));
  if (
    cleanText(city1) === cleanText(city2) &&
    cleanText(country1) === cleanText(country2)
  ) {
    if (
      cleanText(name1) === cleanText(name2) ||
      nameIncluded1 ||
      nameIncluded2
    ) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const geocodeGoogleMaps = async (city) => {
  try {
    const geocodeResponse = await axios.get(api_geo_code, {
      params: {
        address: city,
        key: process.env.API_KEY,
      },
    });
    return geocodeResponse;
  } catch (error) {
    console.log(error.message);
  }
};

const searchPlacesTripAdvisor = async (cordinates, type) => {
  const api_key = process.env.API_KEY_TA;
  const api_location_tripAdvisor = process.env.API_NEARBY_SEARCH_TA;
  const dominio = process.env.NOMBRE_DOMINIO;

  if (!cordinates || !type) {
    console.error("Please send all information");
  }
  const endpoint = api_location_tripAdvisor;
  const params = {
    key: api_key,
    latLong: cordinates,
    category: type,
  };

  const headers = {
    origin: dominio,
    Referer: dominio, // Reemplaza con tu dominio autorizado
  };

  try {
    const response = await axios.get(endpoint, { params, headers });
    const places = Object.values(response.data).flat();
    let placesWithDetails = [];
    for (const place of places) {
      if (place) {
        placesWithDetails.push(
          await getPlaceDetailsTripAdvisor(parseInt(place.location_id, 10))
        );
      }
    }

    return placesWithDetails;
  } catch (error) {
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
    throw error; // Lanzar el error para manejarlo en otro lugar si es necesario
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
    let placeWithDetails;
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
          placeWithDetails = await getPlaceDetailsTripAdvisor(
            parseInt(place.location_id, 10)
          );
        }
      }
    }

    return placeWithDetails;
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
    return place;
  } catch (error) {
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
  }
};

const getNearbyAttractions = async (city) => {
  const api_key = process.env.API_KEY_TA;
  const api_location_tripAdvisor = process.env.API_LOCATION_SEARCH_TA;
  const dominio = process.env.NOMBRE_DOMINIO;

  if (!city) {
    console.error("Please send the city name");
  }

  city = cleanText(city);

  const endpoint = api_location_tripAdvisor;
  const params = {
    key: api_key,
    searchQuery: city,
    category: "attractions",
    radius: 15,
    radiusUnit: "km",
  };

  const headers = {
    origin: dominio,
    Referer: dominio, // Reemplaza con tu dominio autorizado
  };

  try {
    const response = await axios.get(endpoint, { params, headers });

    const places = Object.values(response.data).flat();

    const attractionsPlaces = [];

    for (const place of places) {
      let details = await getPlaceDetailsTripAdvisor(place.location_id);
      delete details.rating_image_url;
      delete details.photo_count;
      delete details.see_all_photos;
      delete details.neighborhood_info;
      attractionsPlaces.push(details);
    }

    console.log(attractionsPlaces);

    return attractionsPlaces;
  } catch (error) {
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
    throw error; // Lanzar el error para manejarlo en otro lugar si es necesario
  }
};

const getCoordinates = async (city, country) => {
  api_key = "pk.68037dd88762a67a25d11841170d2b52";
  const endpoint = "https://us1.locationiq.com/v1/search/structured";
  let lat,
    lon,
    rate = 0;
  const params = {
    city: city,
    country: country,
    format: "json",
    key: api_key,
  };

  try {
    const response = await axios.get(endpoint, { params });
    const places = Object.values(response.data).flat();
    for (const place of places) {
      if (place.importance > rate) {
        rate = place.importance;
        lat = place.lat;
        lon = place.lon;
      }
    }

    return `${lat},${lon}` ;
  } catch (error) {
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
  }
};

module.exports = {
  fetchPlacesByType,
  placesDB,
  searchPlacesTripAdvisor,
  getNearbyAttractions,
  getCoordinates,
  geocodeGoogleMaps,
};
