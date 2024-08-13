//Modelo de la información que se va a extraer de la api sobre los lugares
const createPlace = (
  name,
  address,
  rating,
  website,
  formatted_phone_number,
  description,
  type
) => ({
  //nombre
  name: name,
  //dirección
  address: address,
  //calificación
  rating: rating,
  website: website,
  //Horiarios
  formatted_phone_number: formatted_phone_number,
  //descripción
  description: description,
  //tipo
  type: type,
});

module.exports = { createPlace };