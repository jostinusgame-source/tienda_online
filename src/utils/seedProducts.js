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
            price: 200000,
            stock: 5,
            category: 'Clásicos',
            image_url: 'https://cdn.dealeraccelerate.com/cam/34/1801/73290/1920x1440/1957-chevrolet-corvette-roadster', // Foto portada
            model_url: '' 
        },
        // Copia este bloque para agregar otro auto:
       {
    name: '1957 Oldsmobile Starfire 98 Convertible',
    description: 'Un ícono del lujo clásico, con líneas cromadas brillantes, capota convertible elegante y un motor V8 que ofrece una experiencia vintage única. Su interior amplio en cuero y su exclusividad lo convierten en una joya muy deseada por coleccionistas.',
    price: 620000,
    stock: 10,
    category: 'Clásico',
    image_url: 'https://images.squarespace-cdn.com/content/v1/596649e917bffcd672d15ea4/1535739636945-7ELGQ7LRAJHRKK529BWH/L1002595.jpg?format=1000w',
    model_url: ''
}
,
{
    name: 'Oldsmobile Cutlass Supreme Sedan 1971',
    description: 'Este clásico estadounidense combina un diseño musculoso, un motor robusto y un sonido de escape poderoso. Su interior cómodo y su presencia imponente lo convierten en uno de los sedanes vintage más admirados del muscle car americano.',
    price: 410000,
    stock: 10,
    category: 'Clásico',
    image_url: 'https://media.sketchfab.com/models/78f76d386a4341b0b71745bdc50fd5ab/thumbnails/3d7b0e16e2934a258e9176bb881c1c52/936931a8aeb44021a025fc57202ed0d1.jpeg',
    model_url: '/autos/1.glb'
}
,
{
    name: 'Chapman 1973 Cop Cruiser',
    description: 'Un patrullero retro de los años 70 con diseño low poly, ideal para videojuegos, animaciones y proyectos 3D. Su estética policial clásica y su estilo optimizado lo hacen perfecto para entornos digitales.',
    price: 120000,
    stock: 10,
    category: 'Modelado Low Poly',
    image_url: 'https://media.sketchfab.com/models/61766c1e6e1e4b2b803c174f33433a74/thumbnails/121c90a511e742f98712d8822811f6ba/84e355d517804a00bd688cf416dd29b9.jpeg',
    model_url: '/autos/2.glb'
}
,
{
    name: '2019 NASCAR Ford Mustang',
    description: 'Diseñado exclusivamente para la competición, este Mustang NASCAR cuenta con aerodinámica extrema, un motor de alto rendimiento y un chasis reforzado para alcanzar velocidades impresionantes en pista.',
    price: 850000,
    stock: 10,
    category: 'NASCAR',
    image_url: 'https://s100.iracing.com/wp-content/uploads/2019/05/NASCAR-Cup-Ford-Mustang-1024x576.jpg',
    model_url: '/autos/3.glb'
}
,
{
    name: '2019 Ford GT Heritage Edition',
    description: 'Edición especial inspirada en Le Mans, con carrocería en fibra de carbono, motor EcoBoost V6 biturbo, puertas de apertura vertical y detalles exclusivos que lo convierten en un superauto extremadamente codiciado.',
    price: 895000,
    stock: 10,
    category: 'Superdeportivo',
    image_url: 'https://bringatrailer.com/wp-content/uploads/2022/12/2019_ford_gt_brightened_008_web-scaled.jpg?fit=940%2C627',
    model_url: '/autos/4.glb'
}
,
{
    name: 'Chevrolet Corvette Stingray',
    description: 'Un deportivo legendario con silueta agresiva, motor V8 de gran desempeño, interior tecnológico y un manejo preciso que representa la esencia del automovilismo estadounidense.',
    price: 540000,
    stock: 10,
    category: 'Deportivo',
    image_url: 'https://di-uploads-pod12.dealerinspire.com/stingraychevy/uploads/2020/03/Screen-Shot-2020-03-27-at-11.58.54-AM.png',
    model_url: '/autos/5.glb'
}
,
{
    name: '2006 Ford GT LM Spec II Test Car',
    description: 'Creado para dominar circuitos, con aerodinámica optimizada, construcción ultraligera y un motor de competición capaz de ofrecer un rendimiento brutal en cualquier pista.',
    price: 760000,
    stock: 10,
    category: 'Superdeportivo',
    image_url: 'https://media.sketchfab.com/models/dd6c3effdb1e43ecadace447ccbda68d/thumbnails/74573a8767ba43078c12ee732647ce81/3ecb6f0f9734480293fcef956bf802f4.jpeg',
    model_url: '/autos/6.glb'
}
,
{
    name: '2019 Honda NSX',
    description: 'Un híbrido superdeportivo con tecnología de punta, motor twin-turbo, tracción total inteligente y un diseño elegante que combina tradición japonesa con rendimiento moderno explosivo.',
    price: 680000,
    stock: 10,
    category: 'Híbrido Deportivo',
    image_url: 'https://i.ytimg.com/vi/spWEUdiqIJE/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLB3GWUc5Ffahg2AGyblbzV-jMjoTg',
    model_url: '/autos/7.glb'
}
,
{
    name: '2020 Corvette C8 Stingray Convertible',
    description: 'El Corvette que revolucionó su historia con motor central, diseño futurista, techo retráctil y una aceleración que compite con superautos europeos de élite.',
    price: 730000,
    stock: 10,
    category: 'Deportivo',
    image_url: 'https://fotos.perfil.com/2019/08/30/trim/876/492/corvette-770541.jpg',
    model_url: ''
}
,
{
    name: 'Aston Martin F1 AMR23 2023',
    description: 'Un monoplaza elegante y veloz con aerodinámica refinada, chasis ultraligero y tecnología de Fórmula 1 de última generación. Una obra británica construida para competir al más alto nivel.',
    price: 870000,
    stock: 10,
    category: 'Fórmula 1',
    image_url: 'https://cdn-8.motorsport.com/images/amp/0k7zJ1A0/s1000/aston-martin-23-1.jpg',
    model_url: ''
}
,
{
    name: 'Oracle Red Bull F1 RB19 2023',
    description: 'El monoplaza más dominante de su era, conocido por su aerodinámica impecable, motor explosivo y estabilidad incomparable, convertido ya en un ícono moderno de la Fórmula 1.',
    price: 900000,
    stock: 10,
    category: 'Fórmula 1',
    image_url: 'https://media.sketchfab.com/models/e4afe46f3aab4b23a418da06fc163821/thumbnails/bc90275decbb4148a04facb0039f3c60/e7a6a81994c44777a50e14920a687e33.jpeg',
    model_url: '/autos/10.glb'
}
,
{
    name: 'Mercedes AMG Petronas W14 2023',
    description: 'Representación máxima de ingeniería alemana: aerodinámica avanzada, precisión en cada pieza, diseño oscuro y elegante y un rendimiento que refleja la excelencia Mercedes.',
    price: 860000,
    stock: 10,
    category: 'Fórmula 1',
    image_url: 'https://acnews.blob.core.windows.net/imgnews/large/NAZ_2f922f2a2f024e499aeb4be487a8889c.webp',
    model_url: ''
}
,
{
    name: 'Porsche GT3 RS',
    description: 'Una máquina creada para devorar pistas, con aerodinámica radical, motor atmosférico de altas revoluciones, suspensión de carreras y una conducción pura diseñada para pilotos apasionados.',
    price: 790000,
    stock: 10,
    category: 'Superdeportivo',
    image_url: 'https://puromotor.com/wp-content/uploads/2022/08/2023-porsche-911-gt3-rs-puromotor.jpg',
    model_url: '/autos/12.glb'
}
,
{
    name: '2018 Apollo Intensa Emozione',
    description: 'Un superauto extremo con diseño feroz, estructura de fibra de carbono ultraligera, motor V12 rugiente y una exclusividad absoluta que lo convierte en una bestia de élite.',
    price: 900000,
    stock: 10,
    category: 'Hiperauto',
    image_url: 'https://hips.hearstapps.com/es.h-cdn.co/cades/contenidos/47887/apertura-apollo-intensa-emozione-supercar-3.jpg?crop=0.888888888888889xw:1xh;center,top&resize=1200:*',
    model_url: '/autos/13.glb'
}
,
{
    name: '2024 Ford Mustang GT3',
    description: 'Una bestia homologada para pista con aerodinámica agresiva, motor de alto desempeño, diseño musculoso y un comportamiento dinámico creado para la competición real.',
    price: 880000,
    stock: 10,
    category: 'Deportivo de Competición',
    image_url: 'https://d63oxfkn1m8sf.cloudfront.net/3000x1876/7017/3982/6098/c4503_1.jpg%3Ffit%3D1',
    model_url: '/autos/14.glb'
}
,
 {
        name: '1950 Lincoln Cosmopolitan Presidential Limousine',
        description: 'Una limusina histórica con presencia imponente, diseño clásico de lujo y un interior amplio digno de un vehículo presidencial. Es un ícono de elegancia americana y una pieza coleccionable única.',
        price: 540000,
        stock: 10,
        category: 'Clásico',
        image_url: 'https://image.invaluable.com/housePhotos/bssauction/19/721119/H1285-L285068557_original.jpg',
        model_url: ''
    },
    {
        name: 'Toyota Hilux Champ',
        description: 'Una pickup resistente y versátil, diseñada para soportar trabajo pesado con fiabilidad absoluta. Su durabilidad legendaria la convierte en la compañera perfecta para cualquier terreno.',
        price: 220000,
        stock: 10,
        category: 'Pickup',
        image_url: 'https://www.toyotahiluxchamp.com/wp-content/uploads/2023/12/GREY-Metallic.jpg',
        model_url: ''
    },
    {
        name: '2005 Toyota Hilux Double Cab',
        description: 'Una camioneta robusta con doble cabina, capaz de enfrentar rutas difíciles mientras brinda comodidad y espacio para toda la familia. Una mezcla perfecta entre utilidad y rendimiento.',
        price: 260000,
        stock: 10,
        category: 'Pickup',
        image_url: 'https://360view.3dmodels.org/zoom/Toyota/Toyota_Hilux_Mk6_DoubleCab_2001_1000_0001.jpg',
        model_url: ''
    },
    {
        name: '2005 BMW M3 GTR Need For Speed: Most Wanted',
        description: 'La leyenda de NFS Most Wanted: un M3 con aerodinámica agresiva, potencia extrema y un diseño icónico que marcó a toda una generación de gamers y amantes del motorsport.',
        price: 890000,
        stock: 10,
        category: 'Deportivo',
        image_url: 'https://media.sketchfab.com/models/2999936a393340c0a389c6bd31961a63/thumbnails/97ea33374cc149ce84c8db43458f403c/7667062d30f74fdbac743beda1a9a8d1.jpeg',
        model_url: ''
    },
    {
        name: '1988 BMW M3 Evolution II (E30)',
        description: 'Un clásico del mundo europeo, famoso por su equilibrio, su motor de alto rendimiento y su conducción precisa. El E30 Evo II es una joya codiciada por coleccionistas.',
        price: 610000,
        stock: 10,
        category: 'Clásico Deportivo',
        image_url: 'https://bringatrailer.com/wp-content/uploads/2023/04/pics4cars.com-6-47712-scaled.jpg?fit=940%2C627',
        model_url: ''
    },
    {
        name: '2017 Pandem BMW E30 V1.5 Bodykit',
        description: 'Un E30 transformado radicalmente con el bodykit Pandem V1.5: postura ancha, estilo agresivo y presencia visual que rompe miradas. Perfecto para exhibiciones y cultura stance.',
        price: 340000,
        stock: 10,
        category: 'Modificado',
        image_url: 'https://pandemusa.com/cdn/shop/files/57_280_1000x1000.jpg?v=1750290922',
        model_url: ''
    },
    {
        name: '2016 Pandem - Nissan GTR (R35) V2 with Duck Tail',
        description: 'Un Nissan GT-R R35 modificado con el kit Pandem V2, incluyendo un duck tail imponente y líneas agresivas que resaltan su carácter salvaje y su potencia brutal.',
        price: 720000,
        stock: 10,
        category: 'JDM Modificado',
        image_url: 'https://pandemusa.com/cdn/shop/files/35_242_1000x1000.jpg?v=1750264427',
        model_url: ''
    },
    {
        name: '2022 LB-Silhouette WORKS GT NISSAN 35GT-RR (R35)',
        description: 'Un R35 completamente transformado por Liberty Walk: estética extrema, ensanches masivos y una actitud única. Un espectáculo visual y mecánico para los amantes del tuning.',
        price: 850000,
        stock: 10,
        category: 'JDM Modificado',
        image_url: 'https://media.sketchfab.com/models/19287829a2564641b586670e317fb22c/thumbnails/1005b6ef75674d47ba91ebd2dc8d1d03/f1fee19963cf47d2a0c7197a670d3430.jpeg',
        model_url: ''
    },
    {
        name: '2014 Rocket Bunny Nissan GTR (R35) V1 Aero',
        description: 'El famoso kit Rocket Bunny V1, que convierte al GT-R en una bestia de presencia agresiva con líneas anchas y aerodinámica enfocada en estilo y rendimiento.',
        price: 690000,
        stock: 10,
        category: 'JDM Modificado',
        image_url: 'https://ltmotorwerks.com/cdn/shop/products/3_1024x1024.jpg?v=1485916290',
        model_url: ''
    },
    {
        name: '2011 BenSopra Full Aero Kit for Nissan GT-R R35',
        description: 'Un GT-R radical equipado con el kit BenSopra, famoso por su aerodinámica extrema y su estilo de competición pura. Uno de los diseños más agresivos jamás creados para el R35.',
        price: 770000,
        stock: 10,
        category: 'JDM Modificado',
        image_url: 'https://speedhunters-wp-production.s3.amazonaws.com/wp-content/uploads/2011/10/14085000/BSR35-1.jpg',
        model_url: ''
    },
    {
        name: '1999 Nissan Skyline GT-R (R34) R3',
        description: 'El mítico R34, una leyenda del JDM, conocido por su tracción ATTESA, su turbo poderoso y una reputación que lo coloca como uno de los coches más deseados del mundo.',
        price: 830000,
        stock: 10,
        category: 'JDM',
        image_url: 'https://media.sketchfab.com/models/a0300a4c5e664d379d1fbbf52deca81e/thumbnails/c65f6582df40426f819c4793a8830212/93006feef5474ab88192d2616c095a2b.jpeg',
        model_url: ''
    },
    {
        name: '2018 Nissan GT-R Nismo R3',
        description: 'El GT-R Nismo ofrece un rendimiento salvaje, aerodinámica extrema y una precisión de manejo propia de un superdeportivo japonés de élite.',
        price: 880000,
        stock: 10,
        category: 'JDM Deportivo',
        image_url: 'https://cdn.motor1.com/images/mgl/Bbg6A/s3/2018-nissan-gt-r-nismo-gt3.jpg',
        model_url: ''
    },
    {
        name: '1989 Nissan Skyline GT-R (R32)',
        description: 'El famoso “Godzilla”, un ícono del automovilismo japonés. Ligero, potente y con una tracción inteligente que dominó competiciones en los 90. Un verdadero monstruo JDM.',
        price: 510000,
        stock: 10,
        category: 'JDM Clásico',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Nissan_Skyline_R32_GT-R_001.jpg/1200px-Nissan_Skyline_R32_GT-R_001.jpg',
        model_url: ''
    },
    {
        name: '2022 LB-Silhouette WORKS GT NISSAN 35GT-RR (R35) II',
        description: 'La versión más reciente del kit LB-Silhouette, con detalles más agresivos, mejor aerodinámica y un diseño descomunal perfecto para fanáticos del tuning extremo.',
        price: 860000,
        stock: 10,
        category: 'JDM Modificado',
        image_url: 'https://media.sketchfab.com/models/19287829a2564641b586670e317fb22c/thumbnails/1005b6ef75674d47ba91ebd2dc8d1d03/f1fee19963cf47d2a0c7197a670d3430.jpeg',
        model_url: ''
    },
    {
        name: '2016 Arrinera Hussarya GT',
        description: 'Un superdeportivo poco común, construido con fibra de carbono y diseñado para competir. Su potencia y ligereza lo convierten en una máquina exótica y feroz.',
        price: 870000,
        stock: 10,
        category: 'Superdeportivo',
        image_url: 'https://static.designboom.com/wp-content/uploads/2016/08/13502892_1745334779085786_5404433001876697154_o.jpg',
        model_url: ''
    },
    {
        name: '2016 Ford GT LM',
        description: 'Versión de competición del Ford GT, enfocada completamente en rendimiento. Aerodinámica extrema y potencia brutal diseñada para dominar las pistas más exigentes.',
        price: 900000,
        stock: 10,
        category: 'Competición',
        image_url: 'https://media.ford.com/content/fordmedia/feu/gb/en/news/2015/06/12/ford-gt-le-mans/jcr:content/image.img.881.495.jpg/1500062676084.jpg',
        model_url: ''
    },
    {
        name: '2019 Ford GT LM',
        description: 'Una evolución moderna del modelo LM, con mejoras en aerodinámica, motor y estabilidad. Un superdeportivo de élite pensado para corredores serios.',
        price: 880000,
        stock: 10,
        category: 'Competición',
        image_url: 'https://www.imsa.com/wp-content/uploads/sites/32/2019/11/ford-50-980.jpg',
        model_url: ''
    },
    {
        name: '2019 BYD E-SEED GT',
        description: 'Un deportivo eléctrico futurista con líneas agresivas, tecnología avanzada y aceleración inmediata. Representa la nueva era de rendimiento sustentable.',
        price: 650000,
        stock: 10,
        category: 'Eléctrico Deportivo',
        image_url: 'https://www.bydeurope.com/snews/images/20190417/03.jpg',
        model_url: ''
    },
    {
        name: '2024 BYD Yangwang U9',
        description: 'Un hiperauto eléctrico con tecnología de suspensión inteligente, aceleración brutal y diseño futurista. Un monstruo moderno que redefine el rendimiento EV.',
        price: 900000,
        stock: 10,
        category: 'Hiperauto Eléctrico',
        image_url: 'https://hesucar.com/wp-content/uploads/2024/01/byd-yangwang-u9-hesucar-1.jpg',
        model_url: ''
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