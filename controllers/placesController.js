//Se importan las funciones necesarias del helpers
const {
  placesDB,
  searchPlacesTripAdvisor,
  getNearbyAttractions,
  getCoordinates,
} = require("../helpers/helpers");


//Función que va a servir para obtener la información de los lugares
const getPlaces = async (req, res) => {
  // Se obtiene el lugar que viene del request
  const { city, country, types } = req.body;
  //Validación en caso de no haber nada en el request
  if (!city || !country || !types) {
    return res.status(400).json({ error: "All parameters are required" });
  }

  try {
    //Se llama a la función getCoordinates, se le pasa la ciudad y el país. 
    //Por ultimo se almacenan las coordenadas.
    const coordinates = await getCoordinates(city, country);

    //Se llama a la función searchPlacesTripAdvisor, se le pasan las coordenadas y los tipos de lugares.
    //Finalmente se almacenan los lugares encontrados.
    const places = await searchPlacesTripAdvisor(coordinates, types);

    //Se llama a la función searchPlacesTripAdvisor, se le pasan las coordenadas y los tipos de lugares.
    //Finalmente se almacenan las atracciones encontradas.
    const attractions = await getNearbyAttractions(city);

    console.log(places);
    console.log(attractions);
    
    try {
      // Se llama la funcion placesDB para almacenar los datos en dynamoDB
      //  await placesDB(places.flat())
      //  await placesDB(attractions.flat())
    } catch (error) {
      console.error(error);
    }

    //Si todo funciona correctamente se devuelve todo ok
    res.json("Todo ok");
  } catch (error) {
    //En caso de error se manda un mensaje por consola y se devuelve un esta 500 junto con otro mensaje
    console.error(error);
    res.status(500).json({ error: "Failed to fetch places" });
  }
};

//Se exporta el endpoint 
module.exports = {
  getPlaces,
};
