//Se importan las librerías, modulos y funciones necesarías.
const axios = require("axios");
const path = require("path");
const fs = require("fs");
//Funciones y clases de la librería de cliente de aws.
const {
  DynamoDBClient,
  BatchWriteItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
//Funciones de la librería util de aws.
const { marshall } = require("@aws-sdk/util-dynamodb");

/**
 * Se crea un nuevo objeto tipo cliente de dynamoDB
 * @property {string} region -Es una propiedad que establece en que region esta el servidor a donde se va
 * a conectar el cliente.
 * @property {Object} credentials -Es un objeto que contiene las credenciales para autenticar y autorizar
 * solicitudes con los servicios de aws.
 * @property {string} accessKeyId -Es una cadena que sirve como identificador de la cuenta o usuario en aws
 * @property {string} secretAccessKey -Es una cadena que viene a ser una contraseña secretea de la cuenta o
 * usuario.
 */
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
  },
});

/**
 * Es una array con la propiedades que no se desean incluir en los objetos que contienen la información de
 * los lugares y atracciones turísticas.
 */
const excludeKeys = [
  "rating_image_url",
  "photo_count",
  "see_all_photos",
  "neighborhood_info",
];

/**
 * @function removeExcludedKeys -Se encarga de remover la información no deseada en un objeto place
 * @param {Object} place -Es un objeto que contiene información sobre un lugar o también una atracción.
 *  Ejm: Nombre, dirección, calificación, etc.
 * @returns -Retorna el objeto sin la información no deseada.
 */
const removeExcludedKeys = (place) => {
  const newPlace = { ...place }; // Se crea una copia del objeto original.
  excludeKeys.forEach((key) => {
    //Se hace un recorrido para buscar las propiedades no deseadas.
    delete newPlace[key]; // Se eliminan las propiedades especificadas
  });
  return newPlace; //Se retorna el objeto
};

/**
 * @function placesDB -Se encarga de almacenar los datos en dynamoDB
 * @param {Array} items -Es una array que continene un x cantidad de objetos que pueden ser tipo place
 * o attraction
 * @returns -Esta función no retorna nada
 */
const placesDB = async (data) => {
  const MAX_BATCH_SIZE = 25; //Limite de datos que se pueden cargar por petición a dynamoDB
  const tableName = process.env.TABLE_NAME; // Nombre de la tabla en dynamoDB

  // Array para almacenar los ítems filtrados con la información de interés
  const filteredItems = [];

  for (const item of data) {
    // Se define la clave primaria del item.
    const primaryKey = { location_id: item.location_id };
    // Se verifica si el item ya existe en la tabla
    const exists = await checkIfItemExists(primaryKey);
    if (!exists) {
      //Si no existe el objeto en la base de datos se procede filtrar la información del item
      const sanitizedItem = removeExcludedKeys(item);
      filteredItems.push(sanitizedItem); // Con el item filtrado, se ingresa al array
    }
  }

  // Si no hay items por insertar, se detiene el proceso
  if (filteredItems.length === 0) {
    console.log(
      "No new items to insert. All items are already in the data base."
    );
    return;
  }

  // DSe dviden los items en lotes de 25 items y se cargan a la base de datos
  for (let i = 0; i < filteredItems.length; i += MAX_BATCH_SIZE) {
    const batch = filteredItems.slice(i, i + MAX_BATCH_SIZE);
    /**
     *Se prepara la petición dejando un array de objetos con el formato json correcto para dynamoDB.
     *
     *Marshall es una función que cambia el formato de un objeto json a uno soportado por aws
     */
    const putRequests = batch.map((place) => ({
      PutRequest: {
        Item: marshall(place),
      },
    }));

    //Se ingresa el array a los parametros de la petición
    //TableName es el nombre de la tabla a donde se va a ingresar la información
    const params = {
      RequestItems: {
        [tableName]: putRequests,
      },
    };

    try {
      //Se hace la petición a traves de la función BatchWriteItemCommand del cliente de aws
      const data = await dynamoClient.send(new BatchWriteItemCommand(params));
      //Si todo sale bien se manda un mensaje de que la información se cargo correctamente
      console.log("Batch inserted successfully:", data);
    } catch (err) {
      //En caso de un error se manda un mensaje por consola con la descrición del error
      console.error("Error inserting batch:", err);
    }
  }
};

/**
 * @function checkIfItemExists -Se encarga de verificar si un objeto ya existe en la base de datos.
 * @param {string} key -Es un string que sirve para identificar un objeto en la base de datos.
 * @returns - Retorna true si el objeto existe en la base de datos o false si todavía no existe.
 */
const checkIfItemExists = async (key) => {
  //Se preparan los parametros de la petición
  const params = {
    TableName: process.env.TABLE_NAME, //Nombre de la tabla en la que se va a buscar
    Key: marshall(key), // El id del objeto en el formato json de aws
  };

  try {
    //Se la petición a la base de dato con la función GetItemCommand del cliente de aws
    const data = await dynamoClient.send(new GetItemCommand(params));
    return !!data.Item; // Devuelve true si el item ya existe, false si no
  } catch (err) {
    //En caso de un error se manda un mensaje por consola con la descrición del error
    console.error("Error checking item:", err);
  }
};

/**
 * @function cleanText -Se encarga de limpiar una texto dado, es decir eliminar las tildes y
 * dejar todo en letras minúsculas.
 * @param {String} text -Es una variable que contiene el texto que se va a limpiar.
 * @returns -Retorna el texto límpio
 */
const cleanText = (text) => {
  //Validación para que el parámetro que llegue si sea un string.
  if (typeof text !== "string") {
    //En caso de que no, se manda un mensaje por consola.
    console.error("Expected a string as input");
  }
  //Se retorna el texto límpio
  return text
    .toLowerCase() //Pone el texto en minúsculas
    .normalize("NFD") //Separa las tildes de las letras
    .replace(/[\u0300-\u036f]/g, ""); //Elimina las tildes
};

/**
 * @function searchPlacesTripAdvisor -Es una función que se encarga de buscar lugares en base a unas
 * coordenadas y un tipo de lugar en la api de nearby search de tripAdvisor.
 * @param {String} cordinates -Es una variable que contiene las coordenadas de lugar donde se va a
 * buscar los lugares. Debe estar en formato 'Latitud,Longitud'.
 * @param {String} type -Es una variable que contiene el tipo de lugar que se desea buscar. Ejm: hotels.
 * @returns -Retorna un array de objetos con información mas detallada de los lugares encontrados.
 */
const searchPlacesTripAdvisor = async (cordinates, type) => {
  //Variable que almacena el api key de tripAdvisor
  const api_key = process.env.API_KEY_TA;
  //Variable que almacena la url de la api de nearby search
  const api_nearby_search_tripAdvisor = process.env.API_NEARBY_SEARCH_TA;
  //Variable que almacena el dominio relacionado con la api key
  const dominio = process.env.NOMBRE_DOMINIO;

  //Se valida que tanto las coordenadas como el tipo no sean undefined
  if (!cordinates || !type) {
    console.error("Please send all information");
  }

  //Se preparan los parámetros de la petición
  const params = {
    key: api_key,
    latLong: cordinates,
    category: type,
  };

  //Se preparan los encabezados necesarios para la petición
  //Basicamente se utiliza la misma url para el origin y referer
  const headers = {
    origin: dominio, //indica el origen de donde se está haciendo la solicitud.
    Referer: dominio, //indica la URL desde la que se ha hecho la solicitud.
  };

  try {
    //Se hace la petición a la api de nearby search de tripAdvisor
    const response = await axios.get(api_nearby_search_tripAdvisor, {
      params,
      headers,
    });

    //Se almacena en places un array con la información de los lugares proporcionada
    //por la respuesta de la api
    const places = Object.values(response.data).flat();

    //Se crea un array para almacenar los lugares con su información detallada
    let placesWithDetails = [];
    //Se recorre el array de places
    for (const place of places) {
      if (place) {
        //Si hay un objeto place, se llama a la función getPlaceDetailsTripAdvisor para obtener los detalles
        //del lugar y a la funcion getPlacePhotosTripAdvisor para obtener imagenes de ese lugar.
        placesWithDetails.push(
          await getPlaceDetailsTripAdvisor(parseInt(place.location_id, 10))
        ); //Se manda el id como un entero
        getPlacePhotosTripAdvisor(parseInt(place.location_id, 10)); //Se manda el id como un entero
      }
    }

    //Se retorna el array placesWithDetails
    return placesWithDetails;
  } catch (error) {
    //En caso de error se manda un mensaje por consola
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
  }
};

/**
 * @function getPlaceDetailsTripAdvisor -Se encarga de obtener información detallada de un lugar o atracción
 * de la api de place details de tripAdvisor, en base a un id proporcionado.
 * @param {String} id -Es un variable que almacena el id del lugar del cual se va a
 * traer información detallada.
 * @returns -Retorna un objeto con información detallada del lugar solicitado.
 */
const getPlaceDetailsTripAdvisor = async (id) => {
  //Variable que almacena el api key de tripAdvisor
  const api_key = process.env.API_KEY_TA;
  //Variable que almacena el dominio relacionado con la api key
  const dominio = process.env.NOMBRE_DOMINIO;
  //Validación de que el id no se undifined
  if (!id) {
    console.error("Please send id");
  }
  //Url de la api loacation details de tripAdvisor, el id debe ir directamente en la url
  const endpoint = `https://api.content.tripadvisor.com/api/v1/location/${id}/details`;

  //Se preparan los parámetros de la petición
  const params = {
    key: api_key,
  };

  //Se preparan los encabezados necesarios para la petición
  //Basicamente se utiliza la misma url para el origin y referer
  const headers = {
    origin: dominio, //indica el origen de donde se está haciendo la solicitud.
    Referer: dominio, //indica la URL desde la que se ha hecho la solicitud.
  };

  try {
    //Se hace la petición a traves de axios
    const response = await axios.get(endpoint, { params, headers });

    //Se almacena en place la información del objeto que retorno la api
    const place = response.data;

    //Se retorna el objeto place
    return place;
  } catch (error) {
    //En caso de error se manda un mensaje por consola
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
  }
};
/**
 * @function getNearbyAttractions -Se encarga de buscar atracciones turísticas en base a el nombre de
 * una ciudad en la api de location search de tripAdvisor
 * @param {String} city -Es una varoable que almacena el nombre de la ciudad en la cual se quiere buscar
 * las atracciones turísticas
 * @returns -Restorna un array de objetos con informacion de las atracciones.
 */
const getNearbyAttractions = async (city) => {
  //Variable que almacena el api key de tripAdvisor
  const api_key = process.env.API_KEY_TA;
  //Variable que almacena la url de la api de location search de tripAdvisor
  const api_location_tripAdvisor = process.env.API_LOCATION_SEARCH_TA;
  //Variable que almacena el dominio relacionado con la api key
  const dominio = process.env.NOMBRE_DOMINIO;

  //Validación para verificar que city no sea undifined
  if (!city) {
    console.error("Please send the city name");
  }

  //Se límpia el texto de city
  city = cleanText(city);

  //Se preparan los parámetros de la petición
  const params = {
    key: api_key,
    searchQuery: city,
    category: "attractions", //Se especifíca que se van a buscar atracciones
    radius: 15, //Se manda un radio de busqueda
    radiusUnit: "km", //La unidad de medida del radio de busqueda
  };

  //Se preparan los encabezados necesarios para la petición
  //Basicamente se utiliza la misma url para el origin y referer
  const headers = {
    origin: dominio, //indica el origen de donde se está haciendo la solicitud.
    Referer: dominio, //indica la URL desde la que se ha hecho la solicitud.
  };

  try {
    //Se hace la petición a la api a traves de axios
    const response = await axios.get(api_location_tripAdvisor, {
      params,
      headers,
    });
    //Se almacena en place un array de objetos con la información que retorno la api
    const places = Object.values(response.data).flat();

    //Array donde se van almacenar la información detallada de las atracciones
    const attractionsPlaces = [];

    //Se recorre el array de places
    for (const place of places) {
      if (place) {
        //Si hay un objeto, se llama a la funcion getPlaceDetailsTripAdvisor para obtener información
        //detallada de las atracciones
        let details = await getPlaceDetailsTripAdvisor(place.location_id);
        attractionsPlaces.push(details); // Se ingresa el objeto details con la información de la atracción
      }
    }
    //Se retorna el array attractionsPlaces
    return attractionsPlaces;
  } catch (error) {
    //En caso de un error se manda un mensaje por consola
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
  }
};
/**
 * @function getCoordinates -Se encarga de obtener las coordenadas de una ciudad en base al nombre de la ciudad 
 * y del país, haciendo un petición a la api reverse geocoding de locationIq
 * @param {String} city -Variable que almacena el nombre de la ciudad de la cual se quieren obtener las coordenadas
 * @param {String} country -Variable que almacena el nombre del país donde se encuentra la ciudad proporcionada
 * @returns -Retorna las coordenadas del lugar en un formato 'Longitud, Latitud'
 */
const getCoordinates = async (city, country) => {
  //Api key de locationIq
  const api_key = process.env.API_KEY_LIQ;
  //Variable que almacena la url de la api reverse geocoding de locationIq
  const api_geocoding = process.env.API_REVERSE_GEOCODING_LIQ;
  // variable para almacenar la latitud, longitud y el indice de certeza del lugar
  let lat, lon, rate = 0;
  //Validación para verificar que city no sea undifined
  if (!city) {
    console.error("Please send the city name");
  }
  //Se preparan los parámetros de la petición
  const params = {
    city: city,
    country: country,
    format: "json",//Formato en el que se desea la respuesta
    key: api_key,
  };

  try {
    //Se hace la petición a traves de axios
    const response = await axios.get(api_geocoding, { params });
    //Se almacena en place un array de objetos con la información que retorno la api
    const places = Object.values(response.data).flat();

    //Se recorre el array de places
    for (const place of places) {
      //Si hay un lugar y el indice de certeza del lugar es mayor a lo que haya en rate,
      //Se almacena la latitud y la longitud, por ultimo se actualiza rate para ser el mayor indice de certeza.
      if (place && place.importance > rate) {
        rate = place.importance;
        lat = place.lat;
        lon = place.lon;
      }
    }

    //Se retornan las coordenadas
    return `${lat},${lon}`;
  } catch (error) {
    //En caso de error se manda un mensaje por consola
    console.error(
      "Error al hacer la solicitud a la API de TripAdvisor:",
      error.message
    );
  }
};
/**
* @function getPlacePhotosTripAdvisor -Recupera fotos de la api location photos de TripAdvisor en base a un id y 
*las almacena de forma local.
* @param {String} id - Es el identificador del lugar del que desea obtener fotos.
* @returns -La función no retorna ningún valor.
*/
const getPlacePhotosTripAdvisor = async (id) => {
  //Variable que almacena el api key de tripAdvisor
  const api_key = process.env.API_KEY_TA;
  //Variable que almacena el dominio relacionado con la api key
  const dominio = process.env.NOMBRE_DOMINIO;
  //Validación de que el id no sea Undefined
  if (!id) {
    console.error("Por favor, envía un ID válido.");
    return;
  }
  //Variable que almacena la url de la api location photos, el id debe ir directamente en la url
  const endpoint = `https://api.content.tripadvisor.com/api/v1/location/${id}/photos`;

  //Se preparan los parámetros de la petición
  const params = {
    key: api_key,
    limit: 5, // Limitar a las primeras 5 fotos
  };

  //Se preparan los encabezados necesarios para la petición
  //Basicamente se utiliza la misma url para el origin y referer
  const headers = {
    origin: dominio, //indica el origen de donde se está haciendo la solicitud.
    Referer: dominio, //indica la URL desde la que se ha hecho la solicitud.
  };

  try {
    //Se hace la petición a traves de axios
    const response = await axios.get(endpoint, { params, headers });
    //Se almacena en photos una array de objetos que vinieron en la respuesta de la api
    const photos = response.data.data;
    //Se recorre el array, para ver cada objeto en cada posición 
    photos.forEach(async (photo, index) => {
      // Verifica que el objeto photo y sus propiedades existen
      if (photo.images && photo.images.original && photo.images.original.url) {
        const imageUrl = photo.images.original.url; // URL de la imagen original
        //Ruta para almacenar la imagen
        const imagePath = path.resolve(
          __dirname,
          "images",
          `photo_${id}_${index}.jpg`
        );

        try {
          //Se hace una petición para descargar la imagen como un conjunto de datos
          const imageResponse = await axios({
            url: imageUrl,
            method: "GET",
            responseType: "stream", // Propiedad para descargar como un flujo de datos
          });
          // Crea una carpeta llamada 'images' si no existe para almacenar la imagenes
          if (!fs.existsSync(path.resolve(__dirname, "images"))) {
            fs.mkdirSync(path.resolve(__dirname, "images"));
          }
          // Guardar la imagen en la ruta especificada
          const writer = fs.createWriteStream(imagePath);
          imageResponse.data.pipe(writer);

          // Verifíca que la imagen se descargó correctamente
          writer.on("finish", () =>
            console.log(`Imagen guardada en ${imagePath}`)
          );
          writer.on("error", (err) =>
            console.error("Error al guardar la imagen:", err)
          );
        } catch (err) {
          //En caso de error se manda un mensaje por consola
          console.error("Error al descargar la imagen:", err.message);
        }
      } else {
        //En caso de error se manda un mensaje por consola
        console.log(
          `La imagen original no está disponible para la foto con id ${photo.id}`
        );
      }
    });
  } catch (err) {
    //En caso de error se manda un mensaje por consola
    console.error(
      "Error al hacer la solicitud a la API de fotos de TripAdvisor:",
      err.message
    );
  }
};
// Se exportan las funciones para ser utilizadas en el controlador
module.exports = {
  placesDB,
  searchPlacesTripAdvisor,
  getNearbyAttractions,
  getCoordinates,
};

