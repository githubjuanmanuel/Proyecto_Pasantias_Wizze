const axios = require("axios");
//Se importa el modelo creado
const { createPlace } = require("../models/placeModel");

//Se importa el modelo para la base de datos
const Place = require("../models/placeDbModel");

const api_geo_code = process.env.API_GEOCODE;
const api_nearby_search = process.env.API_NEARBY_SEARCH;
const api_place_details = process.env.API_PLACE_DETAILS

//Función que va a servir para obtener la información de los lugares
const getPlaces = async (req, res) => {
  // Se obtiene el lugar que viene del request
  const { query } = req.body;
    //Validación en caso de no haber nada en el request
  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    // Función para obtener las coordenadas del lugar proporcionado, se utiliza la api de geocoding
    const geocodeResponse = await axios.get(
      api_geo_code,
      {
        params: {
          address: query,
          key: process.env.API_KEY,
        },
      }
    );
    //Se extrae un objeto con la latitud y logitud
    const location = geocodeResponse.data.results[0].geometry.location;
    //Se almacenan las cordenades en la variable
    const locationStr = `${location.lat},${location.lng}`;

    // Tipos de lugares de interes que queremos buscar
    const types = [
      "hotel",
      "restaurant",
      "museum",
      "park",
      "tourist_attraction",
    ];

    // Función para buscar lugares de un tipo específico (por ejemplo buscar tipo hoteles)
    const fetchPlacesByType = async (type) => {
      const response = await axios.get(
        api_nearby_search,
        {
          params: {
            location: locationStr, //Cordenadas
            radius: 5000, // Radio de búsqueda en metros
            type: type, //tipo de ubicación
            key: process.env.API_KEY, 
          },
        }
      );

      return response.data.results.slice(0, 10); // Limitar a los primeros 10 resultados
    };

    // Realizar búsquedas para cada tipo de lugar
    const placeRequests = types.map((type) => fetchPlacesByType(type));
    // Arreglo que almacena todos los resultados de las peticiones anteriores
    const results = await Promise.all(placeRequests);

    // Aplanar la lista de resultados y obtener detalles de los lugares de la api place details
    const places = results.flat().map(async (result) => {
      const detailsResponse = await axios.get(
        api_place_details,
        {
          params: {
            place_id: result.place_id, //id del lugar
            key: process.env.API_KEY,
          },
        }
      );

      // Variable que extrae los resultados de la petición a la api 
      const details = detailsResponse.data.result;

      //se crea un objeto place en base al modelo con la información extraida de la api
      return createPlace(
        details.name,
        details.formatted_address,
        details.rating,
        details.editorial_summary
          ? details.editorial_summary.overview
          : "No description available",
        result.types[0] // Agregar el tipo de lugar al objeto
      );
    });

    
    //Se crea un arreglo que almacena todos lugares con su respectiva información
    const placesWithDetails = await Promise.all(places);

      //Se llama la función para ingresar datos a la base de dato
      placesDB(placesWithDetails);

      //Se devuelven los resultados como un objeto json
      res.json(placesWithDetails);
    } catch (error) {
      //Manejo de errores
      console.error(error);
      res.status(500).json({ error: "Failed to fetch places" });
    }
  };
  
  //Funcion para validar si los lugares esta en la db o ingresarlos
  const placesDB = async (places) => {
  
    for (const place of places) {
  
      const placeExist = await Place.findOne({address:place.address})
  
      if (placeExist) {
        console.log('place exist');
        continue;
      }
   
      try {
        const newPlace = await Place.create({
          name: place.name,
          address:place.address,
          rating: place.rating.toString(),
          description: place.description,
          type: place.type
        })
        console.log('New place added to db');
      } catch (error) {
        console.log(error);
      }
  
    }
  
  }
  

module.exports = {
  getPlaces,
};
