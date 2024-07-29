//Modelo de la información que se va a extraer de la api sobre los lugares
const createPlace = (name, address, rating, description,type) => ({
    //nombre
    name: name, 
    //dirección
    address: address, 
    //calificación
    rating: rating,  
    //descripción 
    description: description, 
    //tipo
    type: type 
  });
  
  module.exports = { createPlace };