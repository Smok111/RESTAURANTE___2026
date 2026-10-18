-- schema_postgres.sql - Sabor Chugurano (compatible con Supabase / PostgreSQL)

-- ===================== Tablas base =====================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (id, name) VALUES
  (1, 'Administrador'),
  (2, 'Mesero'),
  (3, 'Cajero'),
  (4, 'Cocinero / Chef'),
  (5, 'Cliente')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    waiter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    table_number INTEGER,
    status VARCHAR(50) DEFAULT 'Pendiente',
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Completado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    reservation_date DATE NOT NULL,
    reservation_time VARCHAR(20) NOT NULL,
    guests_count INTEGER NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Confirmada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menú Diario Configurable (pizarra del día)
-- entradas y platos se guardan como JSON para conservar el formato que consume el frontend
CREATE TABLE IF NOT EXISTS daily_menus (
    id SERIAL PRIMARY KEY,
    fecha VARCHAR(10) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    precio_menu NUMERIC(10, 2) DEFAULT 10.00,
    entradas TEXT DEFAULT '[]',
    platos TEXT DEFAULT '[]',
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clientes para facturación
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    dni VARCHAR(15),
    ruc VARCHAR(20),
    direccion VARCHAR(200),
    telefono VARCHAR(30),
    email VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comprobantes de venta (factura / boleta)
CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    serie VARCHAR(10) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(150),
    cliente_documento VARCHAR(20),
    direccion VARCHAR(200),
    subtotal NUMERIC(10, 2) NOT NULL,
    igv NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    metodo_pago VARCHAR(50),
    fecha DATE,
    estado VARCHAR(20) DEFAULT 'Emitida',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de cada comprobante
CREATE TABLE IF NOT EXISTS venta_items (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER,
    nombre VARCHAR(150) NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- ===================== Datos iniciales =====================

-- Clientes por defecto
INSERT INTO clientes (id, nombre, dni, direccion, telefono) VALUES
(1, 'Clientes Varios / Mostrador', '00000000', 'Chugur / Lima', ''),
(2, 'Juan Carlos Mendoza', '47589632', 'Av. Las Palmeras 340', '987654321')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clientes (id, nombre, ruc, direccion, telefono) VALUES
(3, 'Inversiones Chugur SAC', '20601234567', 'Jr. Comercio 512, Lima', '945123789')
ON CONFLICT (id) DO NOTHING;

-- Categorías de Sabor Chugurano
INSERT INTO categories (id, name) VALUES
(1, 'Menú del Día (Inc. Entrada)'),
(2, 'Entradas'),
(3, 'Pescados y Mariscos'),
(4, 'Pollos y Carnes'),
(5, 'Chaufas'),
(6, 'Parrillas'),
(7, 'Bebidas')
ON CONFLICT (id) DO NOTHING;

-- Platos de Sabor Chugurano
INSERT INTO menu_items (id, category_id, name, description, price, image_url, is_available) VALUES
(1, 1, 'Costilla Dorada (Menú)', 'Jugosa costilla de cerdo dorada al punto, con arroz graneado y ensalada fresca. ¡Incluye Entrada a elección: Sopa del Día o Papa a la Huancaína!', 10.00, '/images/lomo_saltado.png', TRUE),
(2, 1, 'Pavita (Menú)', 'Tierna pavita dorada con aderezo casero chugurano, arroz y ensalada. ¡Incluye Entrada a elección: Sopa del Día o Papa a la Huancaína!', 10.00, '/images/lomo_saltado.png', TRUE),
(3, 1, 'Seco a la Norteña de Pollo (Menú)', 'Guiso norteño tradicional de pollo al culantro y chicha de jora, con frejoles y arroz. ¡Incluye Entrada a elección: Sopa del Día o Papa a la Huancaína!', 10.00, '/images/lomo_saltado.png', TRUE),
(4, 1, 'Pescado Frito (Menú)', 'Filete de pescado crocante servido con arroz, yucas doradas y zarza criolla. ¡Incluye Entrada a elección: Sopa del Día o Papa a la Huancaína!', 10.00, '/images/ceviche_hero.png', TRUE),
(5, 2, 'Sopa del Día', 'Reconfortante caldo casero con fideos, verduras selectas y hierbas andinas aromáticas. (Incluida con el Menú del Día o a la carta).', 6.00, '/images/parihuela.png', TRUE),
(6, 2, 'Papa a la Huancaína', 'Rodajas de papa sancochada bañadas en cremosa salsa huancaína tradicional, huevo duro y aceituna. (Incluida con el Menú del Día o a la carta).', 8.00, '/images/causa_rellena.png', TRUE),
(7, 3, 'Filete d'' Tilapia', 'Filete de tilapia fresca a la plancha con arroz blanco, guarnición de papas o yucas y ensalada fresca.', 13.00, '/images/ceviche_hero.png', TRUE),
(8, 3, 'Chicharrón d'' Pota', 'Trozos crocantes de pota marina en tempura criolla, acompañados de yucas fritas, salsa tártara y zarza de cebolla roja.', 14.00, '/images/ceviche_hero.png', TRUE),
(9, 3, 'Trucha Frita', 'Trucha entera dorada al punto crocante con papas doradas, arroz blanco y zarza criolla con limón norteño.', 20.00, '/images/ceviche_hero.png', TRUE),
(10, 3, 'Chicharrón d'' Pescado', 'Dados de pescado fresco rebozados y fritos al punto crujiente, servidos con yucas y salsa tártara.', 25.00, '/images/ceviche_hero.png', TRUE),
(11, 3, 'Arroz c/ Mariscos', 'Arroz criollo flameado al wok con mixtura de mariscos frescos, ají panca, pisco y culantro, con toque de queso.', 25.00, '/images/arroz_mariscos.png', TRUE),
(12, 3, 'Ceviche Simple', 'Pescado fresco del día marinado al instante en puro limón norteño, ají limo, cebolla roja, camote glaseado y choclo.', 25.00, '/images/ceviche_hero.png', TRUE),
(13, 3, 'Ceviche Mixto', 'Pescado fresco y mixtura marina selecta marinados con ají limo, camote glaseado, choclo y canchita.', 30.00, '/images/ceviche_hero.png', TRUE),
(14, 3, 'Dúo Marino', 'Ceviche fresco tradicional acompañado de crujiente chicharrón de pescado o pota.', 29.00, '/images/ceviche_hero.png', TRUE),
(15, 3, 'Trío Marino', 'Festín marino completo: Ceviche clásico + Arroz con mariscos flameado + Chicharrón de pescado crocante.', 35.00, '/images/arroz_mariscos.png', TRUE),
(16, 3, 'Frito c/ Ceviche', 'Filete de pescado crocante servido con porción de ceviche fresco norteño y camote.', 15.00, '/images/ceviche_hero.png', TRUE),
(17, 3, 'Leche d'' Tigre', 'Copa de concentrado marino cítrico y picante con trozos de pescado, canchita serrana y chicharrón.', 15.00, '/images/ceviche_hero.png', TRUE),
(18, 4, 'Pollo Frito', 'Presa crujiente de pollo dorado con finas especias secretas, papas fritas y ensalada fresca.', 13.00, '/images/lomo_saltado.png', TRUE),
(19, 4, 'Alita Broster', 'Porción de alitas crocantes estilo broaster con papas fritas artesanales y cremas caseras.', 13.00, '/images/lomo_saltado.png', TRUE),
(20, 4, 'Pechuga a la Plancha', 'Filete de pechuga de pollo marinada y sellada a la plancha con papas fritas y ensalada fresca.', 13.00, '/images/lomo_saltado.png', TRUE),
(21, 4, 'Milanesa d'' Pollo', 'Pechuga apanada dorada y crujiente servida con papas fritas y arroz blanco bien graneado.', 18.00, '/images/lomo_saltado.png', TRUE),
(22, 4, 'Chuleta d'' Chancho', 'Jugosa chuleta de cerdo a la plancha/parrilla con papas doradas, arroz y ensalada mixta.', 20.00, '/images/lomo_saltado.png', TRUE),
(23, 4, 'Lomo Saltado', 'Trozos de lomo fino salteados al wok con cebolla, tomate, ají amarillo y culantro, con papas fritas y arroz.', 25.00, '/images/lomo_saltado.png', TRUE),
(24, 4, 'Chicharrón Pollo', 'Trocitos jugosos de pollo marinados al limón y especias, fritos crocantes con papas fritas y salsas.', 18.00, '/images/lomo_saltado.png', TRUE),
(25, 5, 'Chaufa Pollo', 'Arroz al wok flameado con dados de pechuga de pollo, cebollita china fresca, huevo revuelto y aceite de ajonjolí.', 14.00, '/images/arroz_mariscos.png', TRUE),
(26, 5, 'Chaufa Carne', 'Arroz salteado con lomo de res tierno, cebollita china y salsa de soya al estilo chifa tradicional.', 18.00, '/images/lomo_saltado.png', TRUE),
(27, 5, 'Chaufa Mixto', 'Arroz flameado al wok con trozos de pollo, carne de res, huevo revuelto y toques aromáticos de kion y sésamo.', 20.00, '/images/arroz_mariscos.png', TRUE),
(28, 6, 'Parrilla Simple', 'Corte tierno a las brasas sazonado con chimichurri de la casa, papas fritas y ensalada parrillera.', 20.00, '/images/lomo_saltado.png', TRUE),
(29, 6, 'Parrilla Mixta', 'Generosa combinación a la brasa con carne de res, chuleta, chorizo y pollo, con papas y cremas.', 25.00, '/images/lomo_saltado.png', TRUE),
(30, 6, 'Parrilla a lo Pobre', 'Carne a la parrilla montada con plátano frito dulce, dos huevos fritos a caballo, papas fritas y arroz.', 28.00, '/images/lomo_saltado.png', TRUE),
(31, 7, 'Chicha Morada Tradicional (Jarra)', 'Bebida ancestral peruana a base de maíz morado, piña, manzana, canela, clavo de olor y limón fresco.', 8.00, '/images/chicha_morada.png', TRUE),
(32, 7, 'Gaseosa / Refresco Personal', 'Bebida helada personal (Inca Kola / Coca Cola de 500ml).', 5.00, '/images/chicha_morada.png', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Usuarios de Sabor Chugurano
INSERT INTO users (id, role_id, name, email, password_hash) VALUES
(1, 1, 'Administrador General', 'admin@saborchugurano.pe', 'admin123'),
(2, 2, 'Juan Pérez (Mesero)', 'mesero@saborchugurano.pe', 'mesero123'),
(3, 3, 'Carlos Morales (Cajero)', 'cajero@saborchugurano.pe', 'cajero123'),
(4, 4, 'Doña Rosa (Cocinera Chef)', 'cocina@saborchugurano.pe', 'cocina123')
ON CONFLICT (id) DO NOTHING;

-- ===================== Sincronizar secuencias =====================

SELECT setval(pg_get_serial_sequence('roles', 'id'),       COALESCE((SELECT MAX(id) FROM roles), 1));
SELECT setval(pg_get_serial_sequence('users', 'id'),       COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('categories', 'id'),  COALESCE((SELECT MAX(id) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('menu_items', 'id'),  COALESCE((SELECT MAX(id) FROM menu_items), 1));
SELECT setval(pg_get_serial_sequence('clientes', 'id'),    COALESCE((SELECT MAX(id) FROM clientes), 1));
SELECT setval(pg_get_serial_sequence('orders', 'id'),      1, false);
SELECT setval(pg_get_serial_sequence('order_items', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('payments', 'id'),    1, false);
SELECT setval(pg_get_serial_sequence('reservations', 'id'),1, false);
SELECT setval(pg_get_serial_sequence('daily_menus', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('ventas', 'id'),      1, false);
SELECT setval(pg_get_serial_sequence('venta_items', 'id'), 1, false);
