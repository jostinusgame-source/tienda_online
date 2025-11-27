const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🔌 Conectando para actualización masiva...');
    
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Reiniciar tabla para datos limpios
        await connection.execute('DROP TABLE IF EXISTS products');
        await connection.execute(`
            CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(15, 2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                image_url VARCHAR(500),
                model_url VARCHAR(500), 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // CATÁLOGO DE LUJO (20 AUTOS)
        const products = [
            // FERRARI
            {
                name: 'Ferrari LaFerrari Aperta',
                description: 'La joya híbrida de Maranello. 963 CV a cielo abierto.',
                price: 4500000.00,
                stock: 3,
                image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=800',
                model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Ferrari/glTF/Ferrari.gltf'
            },
            {
                name: 'Ferrari F40 Legacy',
                description: 'El último auto aprobado por Enzo Ferrari. Puro turbo clásico.',
                price: 2100000.00,
                stock: 1,
                image_url: 'https://images.unsplash.com/photo-1627454819213-f77e6826dc6a?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Ferrari 488 Pista',
                description: 'Adrenalina pura derivada de las carreras GT.',
                price: 650000.00,
                stock: 5,
                image_url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800',
                model_url: ''
            },
            
            // LAMBORGHINI
            {
                name: 'Lamborghini Aventador SVJ',
                description: 'El rey de Nürburgring. V12 atmosférico indomable.',
                price: 850000.00,
                stock: 4,
                image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Lamborghini Huracán STO',
                description: 'Un coche de carreras homologado para la calle.',
                price: 450000.00,
                stock: 6,
                image_url: 'https://images.unsplash.com/photo-1566473965997-3de9c817e938?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Lamborghini Countach LPI 800',
                description: 'El renacimiento de una leyenda ochentera.',
                price: 3200000.00,
                stock: 2,
                image_url: 'https://images.unsplash.com/photo-1610887226105-0219c637a445?auto=format&fit=crop&w=800',
                model_url: ''
            },

            // PORSCHE
            {
                name: 'Porsche 911 GT3 RS',
                description: 'Precisión quirúrgica alemana. Alerón activo DRS.',
                price: 380000.00,
                stock: 8,
                image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800',
                model_url: 'https://modelviewer.dev/shared-assets/models/Porsche911GT2.glb'
            },
            {
                name: 'Porsche 918 Spyder',
                description: 'Hiperauto híbrido. Tecnología del futuro, hoy.',
                price: 1800000.00,
                stock: 2,
                image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800',
                model_url: ''
            },

            // BUGATTI
            {
                name: 'Bugatti Chiron Pur Sport',
                description: '1500 CV sintonizados para las curvas, no solo rectas.',
                price: 4200000.00,
                stock: 1,
                image_url: 'https://images.unsplash.com/photo-1600712242805-5f786716a5d7?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Bugatti Divo',
                description: 'Carrocería coachbuilt limitada. Solo para elegidos.',
                price: 5800000.00,
                stock: 1,
                image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800',
                model_url: ''
            },

            // MCLAREN
            {
                name: 'McLaren P1',
                description: 'Aerodinámica activa extrema y modo carrera.',
                price: 2400000.00,
                stock: 3,
                image_url: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'McLaren 720S Spider',
                description: 'Aceleración que desafía la física.',
                price: 320000.00,
                stock: 5,
                image_url: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=800',
                model_url: ''
            },

            // CLÁSICOS Y ESPECIALES
            {
                name: 'Shelby Cobra 427 S/C',
                description: 'El músculo americano original. Sin ayudas, solo tú y el motor.',
                price: 1500000.00,
                stock: 2,
                image_url: 'https://images.unsplash.com/photo-1566008885218-90abf9200ddb?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Aston Martin Valkyrie',
                description: 'Un F1 con matrícula. Diseño de Adrian Newey.',
                price: 3500000.00,
                stock: 1,
                image_url: 'https://images.unsplash.com/photo-1605816988069-424a1b870636?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Pagani Huayra Roadster',
                description: 'Arte sobre ruedas. Fibra de carbono y titanio.',
                price: 2900000.00,
                stock: 1,
                image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Koenigsegg Jesko Absolut',
                description: 'Diseñado para romper la barrera de las 300 mph.',
                price: 4100000.00,
                stock: 1,
                image_url: 'https://images.unsplash.com/photo-1634547903823-389369c43d78?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Nissan GT-R Nismo',
                description: 'Godzilla. El asesino de gigantes tecnológico.',
                price: 220000.00,
                stock: 10,
                image_url: 'https://images.unsplash.com/photo-1604164448130-d1df213c64eb?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Audi R8 V10 Performance',
                description: 'El superdeportivo usable todos los días.',
                price: 190000.00,
                stock: 7,
                image_url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800',
                model_url: ''
            },
             {
                name: 'Mercedes-AMG GT Black Series',
                description: 'El depredador del asfalto con cigüeñal plano.',
                price: 480000.00,
                stock: 3,
                image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Ford GT Heritage Edition',
                description: 'Nacido en Le Mans, criado para la carretera.',
                price: 950000.00,
                stock: 2,
                image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800',
                model_url: ''
            }
        ];

        for (const p of products) {
            await connection.execute(
                'INSERT INTO products (name, description, price, stock, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?)',
                [p.name, p.description, p.price, p.stock, p.image_url, p.model_url || null]
            );
            console.log(`✅ ${p.name}`);
        }

        console.log('🏁 Catálogo reconstruido (20 Autos).');
        await connection.end();
    } catch (e) {
        console.error('❌ Error:', e);
    }
}

seedProducts();