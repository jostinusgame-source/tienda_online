const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🔧 CARGANDO TUS AUTOS DESCARGADOS...');
    
    // Conexión
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    // 1. Limpieza rápida
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE products'); // Solo borra productos, mantiene usuarios
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // -----------------------------------------------------------------------
    // 📝 TU LISTA DE AUTOS (EDITA AQUÍ)
    // -----------------------------------------------------------------------
    // INSTRUCCIONES:
    // 1. 'image_url': Pon el link de internet de la foto de portada.
    // 2. 'model_url': Pon '/autos/NOMBRE_DEL_ARCHIVO.glb' (si lo metiste en src/public/autos)
    
    const misAutos = [
        {
            name: 'Chevrolet Corvette 1957',
            description: 'El Oldsmobile Starfire 98 Convertible del 57 destaca por su elegancia clásica con líneas cromadas brillantes, capota convertible para una experiencia vintage inolvidable, un motor V8 potente, interior de cuero amplio y lujoso, y un nivel de exclusividad que lo convierte en una pieza de colección altamente deseada.',
            price: 200.000,
            stock: 5,
            category: 'Clásicos',
            image_url: 'https://cdnb.artstation.com/p/assets/images/images/001/233/693/large/barba-rossa-olds-01.jpg?1442686432', // Foto portada
            model_url: '/autos/1957.glb' 
        },
        // Copia este bloque para agregar otro auto:
       {
    name: '1957 Oldsmobile Starfire 98 Convertible',
    description: 'Un ícono del lujo clásico, con líneas cromadas brillantes, capota convertible elegante y un motor V8 que ofrece una experiencia vintage única. Su interior amplio en cuero y su exclusividad lo convierten en una joya muy deseada por coleccionistas.',
    price: 620000,
    stock: 10,
    category: 'Clásico',
    image_url: 'https://images.squarespace-cdn.com/content/v1/596649e917bffcd672d15ea4/1535739636945-7ELGQ7LRAJHRKK529BWH/L1002595.jpg?format=1000w',
    model_url: '/autos/1.glb'
}
,
{
    name: 'Oldsmobile Cutlass Supreme Sedan 1971',
    description: 'Este clásico estadounidense combina un diseño musculoso, un motor robusto y un sonido de escape poderoso. Su interior cómodo y su presencia imponente lo convierten en uno de los sedanes vintage más admirados del muscle car americano.',
    price: 410000,
    stock: 10,
    category: 'Clásico',
    image_url: 'https://media.sketchfab.com/models/78f76d386a4341b0b71745bdc50fd5ab/thumbnails/3d7b0e16e2934a258e9176bb881c1c52/936931a8aeb44021a025fc57202ed0d1.jpeg',
    model_url: ''
}
,
{
    name: 'Chapman 1973 Cop Cruiser',
    description: 'Un patrullero retro de los años 70 con diseño low poly, ideal para videojuegos, animaciones y proyectos 3D. Su estética policial clásica y su estilo optimizado lo hacen perfecto para entornos digitales.',
    price: 120000,
    stock: 10,
    category: 'Modelado Low Poly',
    image_url: 'https://media.sketchfab.com/models/61766c1e6e1e4b2b803c174f33433a74/thumbnails/121c90a511e742f98712d8822811f6ba/84e355d517804a00bd688cf416dd29b9.jpeg',
    model_url: '/autos/3.glb'
}
,
{
    name: '2019 NASCAR Ford Mustang',
    description: 'Diseñado exclusivamente para la competición, este Mustang NASCAR cuenta con aerodinámica extrema, un motor de alto rendimiento y un chasis reforzado para alcanzar velocidades impresionantes en pista.',
    price: 850000,
    stock: 10,
    category: 'NASCAR',
    image_url: 'https://s100.iracing.com/wp-content/uploads/2019/05/NASCAR-Cup-Ford-Mustang-1024x576.jpg',
    model_url: '/autos/4.glb'
}
,
{
    name: '2019 Ford GT Heritage Edition',
    description: 'Edición especial inspirada en Le Mans, con carrocería en fibra de carbono, motor EcoBoost V6 biturbo, puertas de apertura vertical y detalles exclusivos que lo convierten en un superauto extremadamente codiciado.',
    price: 895000,
    stock: 10,
    category: 'Superdeportivo',
    image_url: 'https://bringatrailer.com/wp-content/uploads/2022/12/2019_ford_gt_brightened_008_web-scaled.jpg?fit=940%2C627',
    model_url: '/autos/5.glb'
}
,
{
    name: 'Chevrolet Corvette Stingray',
    description: 'Un deportivo legendario con silueta agresiva, motor V8 de gran desempeño, interior tecnológico y un manejo preciso que representa la esencia del automovilismo estadounidense.',
    price: 540000,
    stock: 10,
    category: 'Deportivo',
    image_url: 'https://di-uploads-pod12.dealerinspire.com/stingraychevy/uploads/2020/03/Screen-Shot-2020-03-27-at-11.58.54-AM.png',
    model_url: '/autos/6.glb'
}
,
{
    name: '2006 Ford GT LM Spec II Test Car',
    description: 'Creado para dominar circuitos, con aerodinámica optimizada, construcción ultraligera y un motor de competición capaz de ofrecer un rendimiento brutal en cualquier pista.',
    price: 760000,
    stock: 10,
    category: 'Superdeportivo',
    image_url: 'https://media.sketchfab.com/models/dd6c3effdb1e43ecadace447ccbda68d/thumbnails/74573a8767ba43078c12ee732647ce81/3ecb6f0f9734480293fcef956bf802f4.jpeg',
    model_url: '/autos/7.glb'
}
,
{
    name: '2019 Honda NSX',
    description: 'Un híbrido superdeportivo con tecnología de punta, motor twin-turbo, tracción total inteligente y un diseño elegante que combina tradición japonesa con rendimiento moderno explosivo.',
    price: 680000,
    stock: 10,
    category: 'Híbrido Deportivo',
    image_url: 'https://i.ytimg.com/vi/spWEUdiqIJE/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLB3GWUc5Ffahg2AGyblbzV-jMjoTg',
    model_url: '/autos/8.glb'
}
,
{
    name: '2020 Corvette C8 Stingray Convertible',
    description: 'El Corvette que revolucionó su historia con motor central, diseño futurista, techo retráctil y una aceleración que compite con superautos europeos de élite.',
    price: 730000,
    stock: 10,
    category: 'Deportivo',
    image_url: 'https://fotos.perfil.com/2019/08/30/trim/876/492/corvette-770541.jpg',
    model_url: '/autos/9.glb'
}
,
{
    name: 'Aston Martin F1 AMR23 2023',
    description: 'Un monoplaza elegante y veloz con aerodinámica refinada, chasis ultraligero y tecnología de Fórmula 1 de última generación. Una obra británica construida para competir al más alto nivel.',
    price: 870000,
    stock: 10,
    category: 'Fórmula 1',
    image_url: 'https://cdn-8.motorsport.com/images/amp/0k7zJ1A0/s1000/aston-martin-23-1.jpg',
    model_url: '/autos/10.glb'
}
,
{
    name: 'Oracle Red Bull F1 RB19 2023',
    description: 'El monoplaza más dominante de su era, conocido por su aerodinámica impecable, motor explosivo y estabilidad incomparable, convertido ya en un ícono moderno de la Fórmula 1.',
    price: 900000,
    stock: 10,
    category: 'Fórmula 1',
    image_url: 'https://media.sketchfab.com/models/e4afe46f3aab4b23a418da06fc163821/thumbnails/bc90275decbb4148a04facb0039f3c60/e7a6a81994c44777a50e14920a687e33.jpeg',
    model_url: '/autos/11.glb'
}
,
{
    name: 'Mercedes AMG Petronas W14 2023',
    description: 'Representación máxima de ingeniería alemana: aerodinámica avanzada, precisión en cada pieza, diseño oscuro y elegante y un rendimiento que refleja la excelencia Mercedes.',
    price: 860000,
    stock: 10,
    category: 'Fórmula 1',
    image_url: 'https://acnews.blob.core.windows.net/imgnews/large/NAZ_2f922f2a2f024e499aeb4be487a8889c.webp',
    model_url: '/autos/12.glb'
}
,
{
    name: 'Porsche GT3 RS',
    description: 'Una máquina creada para devorar pistas, con aerodinámica radical, motor atmosférico de altas revoluciones, suspensión de carreras y una conducción pura diseñada para pilotos apasionados.',
    price: 790000,
    stock: 10,
    category: 'Superdeportivo',
    image_url: 'https://puromotor.com/wp-content/uploads/2022/08/2023-porsche-911-gt3-rs-puromotor.jpg',
    model_url: '/autos/13.glb'
}
,
{
    name: '2018 Apollo Intensa Emozione',
    description: 'Un superauto extremo con diseño feroz, estructura de fibra de carbono ultraligera, motor V12 rugiente y una exclusividad absoluta que lo convierte en una bestia de élite.',
    price: 900000,
    stock: 10,
    category: 'Hiperauto',
    image_url: 'https://hips.hearstapps.com/es.h-cdn.co/cades/contenidos/47887/apertura-apollo-intensa-emozione-supercar-3.jpg?crop=0.888888888888889xw:1xh;center,top&resize=1200:*',
    model_url: ''
}
,
{
    name: '2024 Ford Mustang GT3',
    description: 'Una bestia homologada para pista con aerodinámica agresiva, motor de alto desempeño, diseño musculoso y un comportamiento dinámico creado para la competición real.',
    price: 880000,
    stock: 10,
    category: 'Deportivo de Competición',
    image_url: 'https://d63oxfkn1m8sf.cloudfront.net/3000x1876/7017/3982/6098/c4503_1.jpg%3Ffit%3D1',
    model_url: '/autos/15.glb'
}

    ];

    // Inserción
    console.log(`📦 Insertando ${misAutos.length} autos...`);
    
    for (const auto of misAutos) {
        await connection.execute(
            'INSERT INTO products (name, description, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [
                auto.name, 
                auto.description, 
                auto.price, 
                auto.stock, 
                auto.category, 
                auto.image_url,     
                auto.model_url    
            ]
        );
    }

    console.log('✅ ¡AUTOS CARGADOS! Reinicia el servidor y prueba.');
    process.exit();
}

seedProducts();