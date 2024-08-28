const axios = require("axios");
//Se importa el modelo creado
const { createPlace } = require("../models/placeModel");

const {
  fetchPlacesByType,
  placesDB,
  searchPlacesTripAdvisor,
  getNearbyAttractions,
  getCoordinates,
  geocodeGoogleMaps,
} = require("../helpers/helpers");

//Se importa el modelo para la base de datos
// const Place = require("../models/placeDbModel");

const api_geo_code = process.env.API_GEOCODE;
const api_place_details = process.env.API_PLACE_DETAILS;

//Función que va a servir para obtener la información de los lugares
const getPlaces = async (req, res) => {
  // Se obtiene el lugar que viene del request
  const { city, country, types } = req.body;
  //Validación en caso de no haber nada en el request
  if (!city || !country || !types) {
    return res.status(400).json({ error: "All parameters are required" });
  }

  try {
    // Función para obtener las coordenadas del lugar proporcionado conla api de geocoding de google maps
    // const geocodeResponse = geocodeGoogleMaps(city)

    //Se extrae un objeto con la latitud y logitud
    // const location = geocodeResponse.data.results[0].geometry.location;

    //Se almacenan las cordenades en la variable
    // const locationStr = `${location.lat},${location.lng}`;

    // Realizar búsquedas para cada tipo de lugar
    // const placeRequests = types.map((type) =>
    //   fetchPlacesByType(type, locationStr)
    // );
    // Arreglo que almacena todos los resultados de las peticiones anteriores
    // const results = await Promise.all(placeRequests);

    // Aplanar la lista de resultados y obtener detalles de los lugares de la api place details
    // const places = results.flat().map(async (result) => {
    //   const detailsResponse = await axios.get(api_place_details, {
    //     params: {
    //       place_id: result.place_id, //id del lugar
    //       key: process.env.API_KEY
    //     },
    //   });

    //   // Variable que extrae los resultados de la petición a la api
    //   const detailsGoogle = detailsResponse.data.result;

    //   const address_components = detailsGoogle.address_components;

    // return createPlace(
    //   //se crea un objeto place en base al modelo con la información extraida de la api
    //   detailsGoogle.name,
    //   detailsGoogle.formatted_address,
    //   detailsGoogle.rating ? detailsGoogle.rating : "No rating available",
    //   detailsGoogle.website ? detailsGoogle.website : "Website not available",
    //   detailsGoogle.formatted_phone_number
    //     ? detailsGoogle.formatted_phone_number
    //     : "Phone number not available",
    //   detailsGoogle.editorial_summary
    //     ? detailsGoogle.editorial_summary.overview
    //     : "No description available",
    //   detailsGoogle.types // Agregar el tipo de lugar al objeto
    // );
    // });

    //Se crea un arreglo que almacena todos lugares con su respectiva información
    const coordinates = await getCoordinates(city, country);

    console.log(coordinates);

    const places = await searchPlacesTripAdvisor(coordinates, types)


    // const placesWithDetails = await Promise.all(places);

    //Se devuelven los resultados como un objeto json
    res.json(places);
  } catch (error) {
    //Manejo de errores
    console.error(error);
    res.status(500).json({ error: "Failed to fetch places" });
  }
};

module.exports = {
  getPlaces,
};
