// Fuente de datos del catálogo. Agregar nuevos kits a este arreglo.
// Stock de ejemplo: ajustar stock (entero >= 0) y disponible (true/false) según inventario.
// Precios de ejemplo en pesos uruguayos (UYU) para el proyecto.
const productos = [
    { id: 'robopro', nombre: 'Kit de desarrollo Robótica Pro', categoria: 'Robótica educativa', descripcion: 'Con este equipo podrás aprender los fundamentos de la robótica.', precio: 1500, stock: 10, disponible: true, imagen: 'img/robopro.png' },
    { id: 'sensores', nombre: 'Kit de sensores para diferentes tecnologías', categoria: 'Sensores y módulos', descripcion: 'Kit de desarrollo para diferentes tecnologías.', precio: 1850, stock: 10, disponible: true, imagen: 'img/sensores.png' },
    { id: 'ev3', nombre: 'Kit EV3', categoria: 'Kits SPIKE y EV3', descripcion: 'Kit de robótica para educación.', precio: 18500, stock: 10, disponible: true, imagen: 'img/ev3.png' },
    { id: 'microbit', nombre: 'Kit Microbit', categoria: 'Kits micro:bit', descripcion: 'Kit de desarrollo para la plataforma Microbit.', precio: 2900, stock: 10, disponible: true, imagen: 'img/micro.png' },
    { id: 'arduino', nombre: 'Kit Arduino', categoria: 'Kits Arduino', descripcion: 'Explora la electrónica y la programación con Arduino.', precio: 2500, stock: 10, disponible: true, imagen: 'img/arduino.png' },
    { id: 'raspberry-pi', nombre: 'Kit Raspberry Pi', categoria: 'Kits Raspberry Pi', descripcion: 'Desarrolla proyectos de programación con Raspberry Pi.', precio: 6500, stock: 10, disponible: true, imagen: 'img/raspberry.png' },
    { id: 'esp32', nombre: 'Kit ESP32 e IoT', categoria: 'Kits ESP32 e IoT', descripcion: 'Crea proyectos de electrónica e Internet de las cosas con ESP32.', precio: 2200, stock: 10, disponible: true, imagen: 'img/esp.png' },
    { id: 'spike', nombre: 'Kit SPIKE', categoria: 'Kits SPIKE y EV3', descripcion: 'Aprende robótica mediante la construcción y la programación.', precio: 24000, stock: 10, disponible: true, imagen: 'img/spike.png' },
    { id: 'maker', nombre: 'Mega Kit Maker', categoria: 'Kits de electrónica', descripcion: 'Experimenta con electrónica, programación y proyectos maker.', precio: 8900, stock: 10, disponible: true, imagen: 'img/majer.png' }
];

// Un producto sin datos válidos de inventario no se puede comprar.
function obtenerStockDisponible(producto) {
    return producto?.disponible === true && Number.isSafeInteger(producto.stock) && producto.stock > 0
        ? producto.stock : 0;
}

function describirDisponibilidad(producto, stock = obtenerStockDisponible(producto)) {
    if (producto.disponible !== true) return 'No disponible';
    return stock > 0 ? 'Disponible: ' + stock + ' unidades' : 'Sin stock';
}
