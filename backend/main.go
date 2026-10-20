package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"casita-nortena/auth"
	"casita-nortena/database"
	"casita-nortena/middleware"
	"casita-nortena/validation"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

// corsOrigins lee los orígenes permitidos desde CORS_ORIGINS (separados por coma).
func corsOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("CORS_ORIGINS"))
	if raw == "" {
		return []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	}
	partes := strings.Split(raw, ",")
	origenes := make([]string, 0, len(partes))
	for _, p := range partes {
		if o := strings.TrimSpace(p); o != "" {
			origenes = append(origenes, o)
		}
	}
	return origenes
}

// tokenTTL lee la duración del token desde JWT_EXPIRATION_HOURS (por defecto 30 días).
func tokenTTL() time.Duration {
	if h, err := strconv.Atoi(os.Getenv("JWT_EXPIRATION_HOURS")); err == nil && h > 0 {
		return time.Duration(h) * time.Hour
	}
	return 720 * time.Hour
}

func jsonError(c *fiber.Ctx) error {
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error interno del servidor"})
}

func main() {
	// Cargar variables de entorno
	_ = godotenv.Load()

	// Conectar a Supabase (PostgreSQL)
	database.ConnectDB()
	defer database.DB.Close()

	// Migrar contraseñas heredadas en texto plano a hashes bcrypt
	auth.MigratePlaintextPasswords(database.DB)

	// Rotar las contraseñas por defecto de las cuentas sembradas
	auth.RotateSeededPasswords(database.DB)

	if os.Getenv("JWT_SECRET") == "" {
		log.Println("Aviso: JWT_SECRET no está definido; se usará un secreto de desarrollo. Configúralo en .env")
	}

	// Inicializar Fiber
	app := fiber.New(fiber.Config{AppName: "Sabor Chugurano API"})

	// ---- Seguridad: logger, Helmet (cabeceras), Rate limiting y CORS estricto ----
	app.Use(logger.New())
	app.Use(helmet.New())
	app.Use(limiter.New(limiter.Config{
		Max:        200,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Demasiadas solicitudes, intenta más tarde"})
		},
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(corsOrigins(), ","),
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
		MaxAge:           86400,
	}))

	// Servir archivos estáticos subidos
	app.Static("/uploads", "./uploads")

	api := app.Group("/api")

	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "message": "Backend Sabor Chugurano en línea"})
	})

	// Rate limit estricto solo para el login (anti fuerza bruta)
	loginLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Demasiados intentos de inicio de sesión, espera un minuto"})
		},
	})

	// ---------- Rutas públicas ----------
	api.Post("/login", loginLimiter, loginUser)
	api.Post("/register", loginLimiter, registerUser)
	api.Get("/menu", getMenu)
	api.Get("/categories", getCategories)
	api.Get("/daily-menus", getDailyMenus)
	api.Get("/daily-menus/:fecha", getDailyMenuByFecha)

	// ---------- Rutas protegidas (JWT + RBAC) ----------
	priv := api.Group("", middleware.RequireAuth())

	admin := middleware.RequireRoles(middleware.RolAdministrador)
	adminOCaja := middleware.RequireRoles(middleware.RolAdministrador, middleware.RolCajero)
	adminOMesero := middleware.RequireRoles(middleware.RolAdministrador, middleware.RolMesero)
	adminMeseroCajero := middleware.RequireRoles(middleware.RolAdministrador, middleware.RolMesero, middleware.RolCajero)
	adminMeseroCocina := middleware.RequireRoles(middleware.RolAdministrador, middleware.RolMesero, middleware.RolCocinero)
	adminOCocina := middleware.RequireRoles(middleware.RolAdministrador, middleware.RolCocinero)
	personal := middleware.RequireRoles(middleware.RolAdministrador, middleware.RolMesero, middleware.RolCajero, middleware.RolCocinero)

	// Menú y categorías (gestión) — solo Administrador
	priv.Post("/menu", admin, createMenuItem)
	priv.Put("/menu/:id", admin, updateMenuItem)
	priv.Patch("/menu/:id/toggle", admin, toggleMenuItemAvailability)
	priv.Delete("/menu/:id", admin, deleteMenuItem)
	priv.Post("/categories", admin, createCategory)
	priv.Put("/categories/:id", admin, updateCategory)
	priv.Delete("/categories/:id", admin, deleteCategory)
	priv.Post("/upload", admin, uploadImage)

	// Menú Diario (gestión) — solo Administrador
	priv.Post("/daily-menus", admin, saveDailyMenu)
	priv.Delete("/daily-menus/:id", admin, deleteDailyMenu)

	// Clientes — Administrador / Cajero
	priv.Get("/clientes", adminOCaja, getClientes)
	priv.Post("/clientes", adminOCaja, createCliente)
	priv.Delete("/clientes/:id", admin, deleteCliente)

	// Ventas / Facturación — Administrador / Cajero
	priv.Get("/ventas", adminOCaja, getVentas)
	priv.Post("/ventas", adminOCaja, createVenta)
	priv.Patch("/ventas/:id/anular", admin, anularVenta)

	// Órdenes
	priv.Get("/orders", adminMeseroCajero, getOrders)
	priv.Get("/orders/:id", personal, getOrderById)
	priv.Post("/orders", adminOMesero, createOrder)
	priv.Patch("/orders/:id/status", adminMeseroCocina, updateOrderStatus)
	priv.Get("/kitchen/orders", adminOCocina, getKitchenOrders)

	// Mesas
	priv.Get("/tables/status", adminMeseroCajero, getTablesStatus)

	// Caja y Pagos — Administrador / Cajero
	priv.Post("/payments", adminOCaja, createPayment)
	priv.Get("/payments", adminOCaja, getPayments)

	// Personal — solo Administrador
	priv.Get("/users", admin, getUsers)
	priv.Post("/users", admin, createUser)
	priv.Delete("/users/:id", admin, deleteUser)

	// Reservas: los clientes pueden crear, ver y cancelar las suyas.
	priv.Get("/reservations", adminOMesero, getReservations)
	priv.Get("/reservations/mine", getMyReservations)
	priv.Post("/reservations", createReservation)
	priv.Patch("/reservations/:id/cancel", cancelMyReservation)
	priv.Patch("/reservations/:id/status", adminOMesero, updateReservationStatus)
	priv.Delete("/reservations/:id", admin, deleteReservation)

	// Iniciar servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Iniciando servidor en puerto %s", port)
	log.Fatal(app.Listen(":" + port))
}

func getMenu(c *fiber.Ctx) error {
	rows, err := database.DB.Query("SELECT id, name, COALESCE(description, ''), price::float8, category_id, is_available, COALESCE(image_url, '') FROM menu_items ORDER BY id ASC")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var menu []fiber.Map
	for rows.Next() {
		var id, categoryId int
		var name, description, imageUrl string
		var price float64
		var isAvailable bool

		if err := rows.Scan(&id, &name, &description, &price, &categoryId, &isAvailable, &imageUrl); err != nil {
			continue
		}

		menu = append(menu, fiber.Map{
			"id":           id,
			"name":         name,
			"description":  description,
			"price":        price,
			"category_id":  categoryId,
			"image_url":    imageUrl,
			"is_available": isAvailable,
		})
	}

	if menu == nil {
		menu = []fiber.Map{}
	}

	return c.JSON(menu)
}

type OrderItem struct {
	MenuItemID int     `json:"menu_item_id" validate:"required,gt=0"`
	Quantity   int     `json:"quantity" validate:"required,gt=0"`
	UnitPrice  float64 `json:"unit_price" validate:"gte=0"`
	Notes      string  `json:"notes" validate:"max=300"`
}

type OrderRequest struct {
	TableNumber int         `json:"table_number" validate:"required,gt=0"`
	WaiterID    interface{} `json:"waiter_id"`
	Items       []OrderItem `json:"items" validate:"required,min=1,dive"`
}

func createOrder(c *fiber.Ctx) error {
	var req OrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	if len(req.Items) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Order must have at least one item"})
	}

	var totalAmount float64
	for _, item := range req.Items {
		totalAmount += float64(item.Quantity) * item.UnitPrice
	}

	waiterId := toInt(req.WaiterID)
	if waiterId > 0 {
		var wRole int
		errW := database.DB.QueryRow("SELECT role_id FROM users WHERE id = $1", waiterId).Scan(&wRole)
		if errW == nil && wRole != 1 && wRole != 2 {
			return c.Status(403).JSON(fiber.Map{"error": "Restricción de rol: solo meseros o administradores pueden crear comandas"})
		}
	}

	tx, err := database.DB.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error: " + err.Error()})
	}

	var orderId int64
	if waiterId > 0 {
		err = tx.QueryRow("INSERT INTO orders (table_number, waiter_id, status, total_amount) VALUES ($1, $2, 'Pendiente', $3) RETURNING id",
			req.TableNumber, waiterId, totalAmount).Scan(&orderId)
	} else {
		err = tx.QueryRow("INSERT INTO orders (table_number, status, total_amount) VALUES ($1, 'Pendiente', $2) RETURNING id",
			req.TableNumber, totalAmount).Scan(&orderId)
	}
	if err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create order"})
	}

	for _, item := range req.Items {
		subtotal := float64(item.Quantity) * item.UnitPrice
		_, err = tx.Exec("INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal, notes) VALUES ($1, $2, $3, $4, $5, $6)",
			orderId, item.MenuItemID, item.Quantity, item.UnitPrice, subtotal, item.Notes)
		if err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create order items"})
		}
	}

	tx.Commit()

	return c.Status(201).JSON(fiber.Map{"message": "Order created successfully", "order_id": orderId})
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

func loginUser(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	var id int
	var roleId int
	var name, email, phone, passHash, roleName string

	err := database.DB.QueryRow(`
		SELECT u.id, u.role_id, u.name, u.email, COALESCE(u.phone, ''), u.password_hash, COALESCE(r.name, 'Personal') 
		FROM users u 
		LEFT JOIN roles r ON u.role_id = r.id 
		WHERE lower(u.email) = lower($1) OR lower(u.email) = lower(REPLACE($1, '@casita.com', '@saborchugurano.pe'))
		LIMIT 1`, strings.TrimSpace(req.Email)).Scan(&id, &roleId, &name, &email, &phone, &passHash, &roleName)

	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	if !auth.CheckPassword(passHash, req.Password) {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// Si la contraseña aún estaba en texto plano, la migramos a bcrypt.
	if !auth.IsBcryptHash(passHash) {
		if nuevo, e := auth.HashPassword(req.Password); e == nil {
			_, _ = database.DB.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", nuevo, id)
		}
	}

	token, err := auth.GenerateToken(id, name, email, roleId, roleName, tokenTTL())
	if err != nil {
		return jsonError(c)
	}

	return c.JSON(fiber.Map{
		"message":    "Login successful",
		"token":      token,
		"token_type": "Bearer",
		"expires_in": int(tokenTTL().Seconds()),
		"user": fiber.Map{
			"id":        id,
			"name":      name,
			"role_id":   roleId,
			"role_name": roleName,
			"email":     email,
			"phone":     phone,
		},
	})
}

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Phone    string `json:"phone" validate:"required,min=6,max=30"`
	Password string `json:"password" validate:"required,min=6,max=72"`
}

// registerUser crea una cuenta de Cliente (rol 5) y devuelve su sesión.
func registerUser(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	name := strings.TrimSpace(req.Name)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	phone := strings.TrimSpace(req.Phone)

	var existentes int
	if err := database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE lower(email) = lower($1)", email).Scan(&existentes); err != nil {
		return jsonError(c)
	}
	if existentes > 0 {
		return c.Status(409).JSON(fiber.Map{"error": "Ya existe una cuenta con ese correo electrónico"})
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return jsonError(c)
	}

	var id int
	err = database.DB.QueryRow(
		"INSERT INTO users (role_id, name, email, phone, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		middleware.RolCliente, name, email, phone, hash,
	).Scan(&id)
	if err != nil {
		return c.Status(409).JSON(fiber.Map{"error": "No se pudo crear la cuenta: el correo ya está registrado"})
	}

	token, err := auth.GenerateToken(id, name, email, middleware.RolCliente, "Cliente", tokenTTL())
	if err != nil {
		return jsonError(c)
	}

	return c.Status(201).JSON(fiber.Map{
		"message": "Cuenta creada correctamente",
		"token":   token,
		"user": fiber.Map{
			"id":        id,
			"name":      name,
			"role_id":   middleware.RolCliente,
			"role_name": "Cliente",
			"email":     email,
			"phone":     phone,
		},
	})
}

func getOrders(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT o.id, o.table_number, o.status, o.total_amount::float8, o.created_at, COALESCE(u.name, 'Mesero de Sala') 
		FROM orders o 
		LEFT JOIN users u ON o.waiter_id = u.id 
		ORDER BY o.created_at DESC`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var orders []fiber.Map
	for rows.Next() {
		var id, tableNumber int
		var status, createdAt, waiterName string
		var totalAmount float64

		if err := rows.Scan(&id, &tableNumber, &status, &totalAmount, &createdAt, &waiterName); err != nil {
			continue
		}

		orders = append(orders, fiber.Map{
			"id":           id,
			"table_number": tableNumber,
			"status":       status,
			"total_amount": totalAmount,
			"created_at":   createdAt,
			"waiter_name":  waiterName,
		})
	}

	return c.JSON(orders)
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=Pendiente Preparando Completado Servido Pagado Cancelado"`
}

func updateOrderStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateOrderStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	_, err := database.DB.Exec("UPDATE orders SET status = $1 WHERE id = $2", req.Status, id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update status"})
	}

	return c.JSON(fiber.Map{"message": "Status updated"})
}

func getUsers(c *fiber.Ctx) error {
	rows, err := database.DB.Query("SELECT id, role_id, name, email FROM users WHERE role_id <> $1", middleware.RolCliente)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var users []fiber.Map
	for rows.Next() {
		var id, roleId int
		var name, email string
		if err := rows.Scan(&id, &roleId, &name, &email); err != nil {
			continue
		}
		users = append(users, fiber.Map{
			"id":      id,
			"role_id": roleId,
			"name":    name,
			"email":   email,
		})
	}
	return c.JSON(users)
}

type CreateUserRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	RoleID   int    `json:"role_id" validate:"required,oneof=1 2 3 4 5"`
}

func createUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return jsonError(c)
	}

	var id int64
	err = database.DB.QueryRow("INSERT INTO users (role_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id", req.RoleID, req.Name, req.Email, hash).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user"})
	}
	return c.Status(201).JSON(fiber.Map{"message": "User created", "id": id})
}

func deleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	_, err := database.DB.Exec("DELETE FROM users WHERE id = $1", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete user"})
	}
	return c.JSON(fiber.Map{"message": "User deleted"})
}

func getKitchenOrders(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT o.id, o.table_number, o.status, o.created_at, COALESCE(u.name, 'Mesero de Sala') 
		FROM orders o 
		LEFT JOIN users u ON o.waiter_id = u.id 
		WHERE o.status IN ('Pendiente', 'Preparando') 
		ORDER BY o.created_at ASC`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var orders []fiber.Map
	for rows.Next() {
		var id, tableNumber int
		var status, createdAt, waiterName string

		if err := rows.Scan(&id, &tableNumber, &status, &createdAt, &waiterName); err != nil {
			continue
		}

		itemRows, err := database.DB.Query(`
			SELECT oi.quantity, oi.notes, mi.name 
			FROM order_items oi
			JOIN menu_items mi ON oi.menu_item_id = mi.id
			WHERE oi.order_id = $1`, id)

		var items []fiber.Map
		if err == nil {
			for itemRows.Next() {
				var qty int
				var name string
				var notesPtr *string
				if err := itemRows.Scan(&qty, &notesPtr, &name); err == nil {
					noteStr := ""
					if notesPtr != nil {
						noteStr = *notesPtr
					}
					items = append(items, fiber.Map{
						"quantity": qty,
						"notes":    noteStr,
						"name":     name,
					})
				}
			}
			itemRows.Close()
		}

		if items == nil {
			items = []fiber.Map{}
		}

		orders = append(orders, fiber.Map{
			"id":           id,
			"table_number": tableNumber,
			"status":       status,
			"created_at":   createdAt,
			"waiter_name":  waiterName,
			"items":        items,
		})
	}

	if orders == nil {
		orders = []fiber.Map{}
	}

	return c.JSON(orders)
}

// Modelos para peticiones
type MenuItemRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=150"`
	Description string  `json:"description" validate:"max=1000"`
	Price       float64 `json:"price" validate:"required,gt=0"`
	CategoryID  int     `json:"category_id" validate:"required,gt=0"`
	ImageURL    string  `json:"image_url" validate:"max=255"`
	IsAvailable bool    `json:"is_available"`
}

type PaymentRequest struct {
	OrderID       interface{} `json:"order_id"`
	CashierID     interface{} `json:"cashier_id"`
	PaymentMethod string      `json:"payment_method" validate:"required,min=2,max=50"`
	Amount        interface{} `json:"amount"`
}

func toInt(val interface{}) int {
	if val == nil {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return int(v)
	case float32:
		return int(v)
	case int:
		return v
	case string:
		i, _ := strconv.Atoi(v)
		return i
	default:
		return 0
	}
}

func toFloat(val interface{}) float64 {
	if val == nil {
		return 0.0
	}
	switch v := val.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case string:
		f, _ := strconv.ParseFloat(v, 64)
		return f
	default:
		return 0.0
	}
}

// Handlers de Menú
func getCategories(c *fiber.Ctx) error {
	rows, err := database.DB.Query("SELECT id, name FROM categories ORDER BY id ASC")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var cats []fiber.Map
	for rows.Next() {
		var id int
		var name string
		if err := rows.Scan(&id, &name); err == nil {
			cats = append(cats, fiber.Map{"id": id, "name": name})
		}
	}
	if cats == nil {
		cats = []fiber.Map{}
	}
	return c.JSON(cats)
}

func createMenuItem(c *fiber.Ctx) error {
	var req MenuItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}
	var id int64
	err := database.DB.QueryRow("INSERT INTO menu_items (name, description, price, category_id, image_url, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
		req.Name, req.Description, req.Price, req.CategoryID, req.ImageURL, req.IsAvailable).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"message": "Plato creado exitosamente", "id": id, "image_url": req.ImageURL})
}

func updateMenuItem(c *fiber.Ctx) error {
	id := c.Params("id")
	var req MenuItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}
	_, err := database.DB.Exec("UPDATE menu_items SET name = $1, description = $2, price = $3, category_id = $4, image_url = $5, is_available = $6 WHERE id = $7",
		req.Name, req.Description, req.Price, req.CategoryID, req.ImageURL, req.IsAvailable, id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Plato actualizado exitosamente"})
}

func toggleMenuItemAvailability(c *fiber.Ctx) error {
	id := c.Params("id")
	_, err := database.DB.Exec("UPDATE menu_items SET is_available = NOT is_available WHERE id = $1", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Disponibilidad actualizada"})
}

func deleteMenuItem(c *fiber.Ctx) error {
	id := c.Params("id")
	_, err := database.DB.Exec("DELETE FROM menu_items WHERE id = $1", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Plato eliminado exitosamente"})
}

// Handlers de Órdenes y Mesas
func getOrderById(c *fiber.Ctx) error {
	idStr := c.Params("id")
	orderId, _ := strconv.Atoi(idStr)
	var tableNumber int
	var status, createdAt string
	var totalAmount float64

	err := database.DB.QueryRow("SELECT id, table_number, status, total_amount::float8, created_at FROM orders WHERE id = $1", orderId).Scan(&orderId, &tableNumber, &status, &totalAmount, &createdAt)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Orden no encontrada"})
	}

	itemRows, err := database.DB.Query(`
		SELECT oi.quantity, oi.unit_price::float8, oi.subtotal::float8, oi.notes, mi.name 
		FROM order_items oi
		JOIN menu_items mi ON oi.menu_item_id = mi.id
		WHERE oi.order_id = $1`, orderId)

	var items []fiber.Map
	if err == nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var qty int
			var unitPrice, subtotal float64
			var notesPtr *string
			var name string
			if err := itemRows.Scan(&qty, &unitPrice, &subtotal, &notesPtr, &name); err == nil {
				noteStr := ""
				if notesPtr != nil {
					noteStr = *notesPtr
				}
				items = append(items, fiber.Map{
					"quantity":   qty,
					"unit_price": unitPrice,
					"subtotal":   subtotal,
					"notes":      noteStr,
					"name":       name,
				})
			}
		}
	}
	if items == nil {
		items = []fiber.Map{}
	}

	return c.JSON(fiber.Map{
		"id":           orderId,
		"table_number": tableNumber,
		"status":       status,
		"total_amount": totalAmount,
		"created_at":   createdAt,
		"items":        items,
	})
}

func getTablesStatus(c *fiber.Ctx) error {
	tables := make([]fiber.Map, 12)
	for i := 1; i <= 12; i++ {
		tables[i-1] = fiber.Map{
			"table_number": i,
			"status":       "Libre",
			"order_id":     nil,
			"total_amount": 0.0,
			"created_at":   "",
		}
	}

	rows, err := database.DB.Query(`
		SELECT id, table_number, status, total_amount::float8, created_at 
		FROM orders 
		WHERE status IN ('Pendiente', 'Preparando', 'Completado')
		ORDER BY id DESC`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, tableNumber int
			var status, createdAt string
			var totalAmount float64
			if err := rows.Scan(&id, &tableNumber, &status, &totalAmount, &createdAt); err == nil {
				if tableNumber >= 1 && tableNumber <= 12 {
					idx := tableNumber - 1
					currentStatus := tables[idx]["status"].(string)
					if currentStatus == "Libre" {
						mappedStatus := "Ocupada"
						if status == "Completado" {
							mappedStatus = "Por Cobrar"
						}
						tables[idx] = fiber.Map{
							"table_number": tableNumber,
							"status":       mappedStatus,
							"order_status": status,
							"order_id":     id,
							"total_amount": totalAmount,
							"created_at":   createdAt,
						}
					}
				}
			}
		}
	}

	return c.JSON(tables)
}

// Handlers de Caja y Pagos
func createPayment(c *fiber.Ctx) error {
	var req PaymentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body: " + err.Error()})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	orderId := toInt(req.OrderID)
	cashierId := toInt(req.CashierID)
	amount := toFloat(req.Amount)

	if orderId == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "ID de orden inválido o requerido"})
	}
	if cashierId == 0 {
		cashierId = 1
	}

	// Restricción de rol: verificar que el cajero tenga rol 1 (Admin) o rol 3 (Cajero)
	var cRole int
	errC := database.DB.QueryRow("SELECT role_id FROM users WHERE id = $1", cashierId).Scan(&cRole)
	if errC == nil && cRole != 1 && cRole != 3 {
		return c.Status(403).JSON(fiber.Map{"error": "Restricción de rol: solo personal de caja o administración puede procesar cobros"})
	}

	tx, err := database.DB.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	var paymentId int64
	err = tx.QueryRow("INSERT INTO payments (order_id, cashier_id, payment_method, amount, status) VALUES ($1, $2, $3, $4, 'Completado') RETURNING id",
		orderId, cashierId, req.PaymentMethod, amount).Scan(&paymentId)
	if err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"error": "Error al registrar pago: " + err.Error()})
	}

	_, err = tx.Exec("UPDATE orders SET status = 'Pagado' WHERE id = $1", orderId)
	if err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"error": "Error al actualizar estado de orden: " + err.Error()})
	}

	tx.Commit()

	return c.Status(201).JSON(fiber.Map{
		"message":    "Pago registrado con éxito",
		"payment_id": paymentId,
	})
}

func getPayments(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT p.id, p.order_id, p.payment_method, p.amount::float8, p.status, p.created_at, o.table_number 
		FROM payments p
		JOIN orders o ON p.order_id = o.id
		ORDER BY p.created_at DESC LIMIT 50`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var payments []fiber.Map
	for rows.Next() {
		var id, orderId, tableNumber int
		var paymentMethod, status, createdAt string
		var amount float64
		if err := rows.Scan(&id, &orderId, &paymentMethod, &amount, &status, &createdAt, &tableNumber); err == nil {
			payments = append(payments, fiber.Map{
				"id":             id,
				"order_id":       orderId,
				"table_number":   tableNumber,
				"payment_method": paymentMethod,
				"amount":         amount,
				"status":         status,
				"created_at":     createdAt,
			})
		}
	}
	if payments == nil {
		payments = []fiber.Map{}
	}
	return c.JSON(payments)
}

// Handlers de Reservas
type ReservationRequest struct {
	Name            string `json:"name" validate:"required,min=2,max=100"`
	Phone           string `json:"phone" validate:"required,min=6,max=30"`
	Email           string `json:"email" validate:"omitempty,email"`
	ReservationDate string `json:"reservation_date" validate:"required"`
	ReservationTime string `json:"reservation_time" validate:"required"`
	GuestsCount     int    `json:"guests_count" validate:"required,gte=1,lte=100"`
	Notes           string `json:"notes" validate:"max=500"`
}

type UpdateReservationStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=Confirmada Pendiente Cancelada Atendida"`
}

func createReservation(c *fiber.Ctx) error {
	var req ReservationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body: " + err.Error()})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Name == "" || req.Phone == "" || req.ReservationDate == "" || req.ReservationTime == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Nombre, teléfono, fecha y hora son obligatorios"})
	}

	if req.GuestsCount <= 0 {
		req.GuestsCount = 2
	}

	if req.Email == "" {
		if correo, ok := c.Locals("user_email").(string); ok {
			req.Email = correo
		}
	}

	userID := middleware.UserID(c)

	var id int64
	err := database.DB.QueryRow(`
		INSERT INTO reservations (user_id, name, phone, email, reservation_date, reservation_time, guests_count, notes, status) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Confirmada') RETURNING id`,
		userID, req.Name, req.Phone, req.Email, req.ReservationDate, req.ReservationTime, req.GuestsCount, req.Notes).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error al registrar reserva: " + err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{
		"message":        "Reserva confirmada exitosamente",
		"reservation_id": id,
	})
}

// getMyReservations devuelve las reservas del usuario autenticado. También
// incluye reservas antiguas hechas con su correo antes de existir user_id.
func getMyReservations(c *fiber.Ctx) error {
	userID := middleware.UserID(c)
	email, _ := c.Locals("user_email").(string)

	rows, err := database.DB.Query(`
		SELECT id, name, phone, COALESCE(email, ''), reservation_date, reservation_time, guests_count, COALESCE(notes, ''), status, created_at
		FROM reservations
		WHERE user_id = $1 OR (user_id IS NULL AND email IS NOT NULL AND lower(email) = lower($2))
		ORDER BY reservation_date DESC, reservation_time DESC`, userID, email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	reservations := []fiber.Map{}
	for rows.Next() {
		var id, guestsCount int
		var name, phone, correo, resDate, resTime, notes, status, createdAt string

		if err := rows.Scan(&id, &name, &phone, &correo, &resDate, &resTime, &guestsCount, &notes, &status, &createdAt); err != nil {
			continue
		}
		cleanDate := resDate
		if len(cleanDate) >= 10 {
			cleanDate = cleanDate[:10]
		}
		reservations = append(reservations, fiber.Map{
			"id":               id,
			"name":             name,
			"phone":            phone,
			"email":            correo,
			"reservation_date": cleanDate,
			"reservation_time": resTime,
			"guests_count":     guestsCount,
			"notes":            notes,
			"status":           status,
			"created_at":       createdAt,
		})
	}
	return c.JSON(reservations)
}

// cancelMyReservation permite al titular (o al personal) cancelar una reserva.
func cancelMyReservation(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.UserID(c)
	roleID := middleware.RoleID(c)
	userEmail, _ := c.Locals("user_email").(string)

	var ownerID int
	var ownerEmail, status string
	err := database.DB.QueryRow(
		"SELECT COALESCE(user_id, 0), COALESCE(email, ''), COALESCE(status, '') FROM reservations WHERE id = $1",
		id,
	).Scan(&ownerID, &ownerEmail, &status)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Reserva no encontrada"})
	}

	esPersonal := roleID == middleware.RolAdministrador || roleID == middleware.RolMesero
	esTitular := (ownerID != 0 && ownerID == userID) ||
		(ownerID == 0 && ownerEmail != "" && strings.EqualFold(ownerEmail, userEmail))
	if !esPersonal && !esTitular {
		return c.Status(403).JSON(fiber.Map{"error": "No puedes cancelar una reserva que no te pertenece"})
	}

	if status == "Atendida" {
		return c.Status(400).JSON(fiber.Map{"error": "Esta reserva ya fue atendida y no se puede cancelar"})
	}
	if status == "Cancelada" {
		return c.JSON(fiber.Map{"message": "La reserva ya estaba cancelada"})
	}

	if _, err := database.DB.Exec("UPDATE reservations SET status = 'Cancelada' WHERE id = $1", id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error al cancelar la reserva"})
	}
	return c.JSON(fiber.Map{"message": "Reserva cancelada correctamente"})
}

func getReservations(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, name, phone, email, reservation_date, reservation_time, guests_count, notes, status, created_at 
		FROM reservations 
		ORDER BY reservation_date ASC, reservation_time ASC`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var reservations []fiber.Map
	for rows.Next() {
		var id, guestsCount int
		var name, phone, email, resDate, resTime, notes, status, createdAt string
		var emailPtr, notesPtr *string

		if err := rows.Scan(&id, &name, &phone, &emailPtr, &resDate, &resTime, &guestsCount, &notesPtr, &status, &createdAt); err == nil {
			email = ""
			if emailPtr != nil {
				email = *emailPtr
			}
			notes = ""
			if notesPtr != nil {
				notes = *notesPtr
			}
			cleanDate := resDate
			if len(cleanDate) >= 10 {
				cleanDate = cleanDate[:10]
			}
			reservations = append(reservations, fiber.Map{
				"id":               id,
				"name":             name,
				"customer_name":    name,
				"phone":            phone,
				"customer_phone":   phone,
				"email":            email,
				"customer_email":   email,
				"reservation_date": cleanDate,
				"reservation_time": resTime,
				"guests_count":     guestsCount,
				"notes":            notes,
				"special_requests": notes,
				"status":           status,
				"created_at":       createdAt,
			})
		}
	}
	if reservations == nil {
		reservations = []fiber.Map{}
	}
	return c.JSON(reservations)
}

func updateReservationStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateReservationStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	_, err := database.DB.Exec("UPDATE reservations SET status = $1 WHERE id = $2", req.Status, id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error al actualizar estado de reserva"})
	}
	return c.JSON(fiber.Map{"message": "Estado de reserva actualizado"})
}

func deleteReservation(c *fiber.Ctx) error {
	id := c.Params("id")
	_, err := database.DB.Exec("DELETE FROM reservations WHERE id = $1", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error al eliminar reserva"})
	}
	return c.JSON(fiber.Map{"message": "Reserva eliminada"})
}

func uploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No se recibió archivo de imagen: " + err.Error()})
	}

	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".png"
	}
	filename := fmt.Sprintf("%d_dish%s", time.Now().UnixNano(), ext)

	_ = os.MkdirAll("uploads", 0755)
	backendDest := filepath.Join("uploads", filename)
	if err := c.SaveFile(file, backendDest); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error al guardar imagen: " + err.Error()})
	}

	// También copiar a frontend/public/uploads si existe
	frontendUploads := filepath.Join("..", "frontend", "public", "uploads")
	_ = os.MkdirAll(frontendUploads, 0755)
	frontendDest := filepath.Join(frontendUploads, filename)
	_ = copyFile(backendDest, frontendDest)

	return c.JSON(fiber.Map{
		"message":  "Imagen subida exitosamente",
		"url":      "/uploads/" + filename,
		"filename": filename,
	})
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

// ------------------- Categorías -------------------

type CategoryRequest struct {
	Name string `json:"name" validate:"required,min=2,max=100"`
}

func createCategory(c *fiber.Ctx) error {
	var req CategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	var id int64
	err := database.DB.QueryRow("INSERT INTO categories (name) VALUES ($1) RETURNING id", req.Name).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"message": "Categoría creada", "id": id, "name": req.Name})
}

func updateCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	var req CategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	_, err := database.DB.Exec("UPDATE categories SET name = $1 WHERE id = $2", req.Name, id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Categoría actualizada"})
}

func deleteCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := database.DB.Exec("DELETE FROM categories WHERE id = $1", id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Categoría eliminada"})
}

// ------------------- Menú Diario -------------------

type DailyPlato struct {
	ID          int64   `json:"id"`
	Nombre      string  `json:"nombre"`
	Descripcion string  `json:"descripcion,omitempty"`
	Precio      float64 `json:"precio"`
	Categoria   string  `json:"categoria"`
	ImagenURL   string  `json:"imagen_url,omitempty"`
	Disponible  bool    `json:"disponible"`
}

type DailyMenuRequest struct {
	Fecha      string       `json:"fecha" validate:"required"`
	Activo     bool         `json:"activo"`
	PrecioMenu float64      `json:"precio_menu" validate:"gte=0"`
	Entradas   []string     `json:"entradas"`
	Platos     []DailyPlato `json:"platos"`
	Notas      string       `json:"notas" validate:"max=1000"`
}

func dailyMenuMapBool(id int64, fecha string, activo bool, precio float64, entradasJSON, platosJSON, notas, createdAt string) fiber.Map {
	entradas := []string{}
	_ = json.Unmarshal([]byte(entradasJSON), &entradas)

	platos := []DailyPlato{}
	_ = json.Unmarshal([]byte(platosJSON), &platos)

	return fiber.Map{
		"id":          id,
		"fecha":       fecha,
		"activo":      activo,
		"precio_menu": precio,
		"entradas":    entradas,
		"platos":      platos,
		"notas":       notas,
		"created_at":  createdAt,
	}
}

func getDailyMenus(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, fecha, activo, precio_menu::float8, COALESCE(entradas, '[]'), COALESCE(platos, '[]'), COALESCE(notas, ''), created_at
		FROM daily_menus ORDER BY fecha DESC`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	menus := []fiber.Map{}
	for rows.Next() {
		var id int64
		var fecha, entradasJSON, platosJSON, notas, createdAt string
		var activo bool
		var precio float64
		if err := rows.Scan(&id, &fecha, &activo, &precio, &entradasJSON, &platosJSON, &notas, &createdAt); err != nil {
			continue
		}
		menus = append(menus, dailyMenuMapBool(id, fecha, activo, precio, entradasJSON, platosJSON, notas, createdAt))
	}
	return c.JSON(menus)
}

func getDailyMenuByFecha(c *fiber.Ctx) error {
	fecha := c.Params("fecha")
	var id int64
	var fechaDB, entradasJSON, platosJSON, notas, createdAt string
	var activo bool
	var precio float64
	err := database.DB.QueryRow(`
		SELECT id, fecha, activo, precio_menu::float8, COALESCE(entradas, '[]'), COALESCE(platos, '[]'), COALESCE(notas, ''), created_at
		FROM daily_menus WHERE fecha = $1 LIMIT 1`, fecha).
		Scan(&id, &fechaDB, &activo, &precio, &entradasJSON, &platosJSON, &notas, &createdAt)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "No hay menú para esa fecha"})
	}
	return c.JSON(dailyMenuMapBool(id, fechaDB, activo, precio, entradasJSON, platosJSON, notas, createdAt))
}

func saveDailyMenu(c *fiber.Ctx) error {
	var req DailyMenuRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body: " + err.Error()})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}
	if req.Fecha == "" {
		return c.Status(400).JSON(fiber.Map{"error": "La fecha del menú es obligatoria"})
	}
	if req.Entradas == nil {
		req.Entradas = []string{}
	}
	if req.Platos == nil {
		req.Platos = []DailyPlato{}
	}

	entradasJSON, _ := json.Marshal(req.Entradas)
	platosJSON, _ := json.Marshal(req.Platos)

	_, err := database.DB.Exec(`
		INSERT INTO daily_menus (fecha, activo, precio_menu, entradas, platos, notas)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT(fecha) DO UPDATE SET
			activo = excluded.activo,
			precio_menu = excluded.precio_menu,
			entradas = excluded.entradas,
			platos = excluded.platos,
			notas = excluded.notas`,
		req.Fecha, req.Activo, req.PrecioMenu, string(entradasJSON), string(platosJSON), req.Notas)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error al guardar el menú: " + err.Error()})
	}

	var id int64
	var fechaDB, entradasDB, platosDB, notasDB, createdAt string
	var activoDB bool
	var precioDB float64
	err = database.DB.QueryRow(`
		SELECT id, fecha, activo, precio_menu::float8, COALESCE(entradas, '[]'), COALESCE(platos, '[]'), COALESCE(notas, ''), created_at
		FROM daily_menus WHERE fecha = $1 LIMIT 1`, req.Fecha).
		Scan(&id, &fechaDB, &activoDB, &precioDB, &entradasDB, &platosDB, &notasDB, &createdAt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Menú guardado, pero no se pudo recuperar"})
	}

	return c.Status(201).JSON(dailyMenuMapBool(id, fechaDB, activoDB, precioDB, entradasDB, platosDB, notasDB, createdAt))
}

func deleteDailyMenu(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := database.DB.Exec("DELETE FROM daily_menus WHERE id = $1", id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Menú eliminado"})
}

// ------------------- Clientes -------------------

type ClienteRequest struct {
	Nombre    string `json:"nombre" validate:"required,min=2,max=150"`
	DNI       string `json:"dni" validate:"omitempty,len=8,numeric"`
	RUC       string `json:"ruc" validate:"omitempty,len=11,numeric"`
	Direccion string `json:"direccion" validate:"max=200"`
	Telefono  string `json:"telefono" validate:"max=30"`
	Email     string `json:"email" validate:"omitempty,email"`
}

func getClientes(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, nombre, COALESCE(dni, ''), COALESCE(ruc, ''), COALESCE(direccion, ''), COALESCE(telefono, ''), COALESCE(email, '')
		FROM clientes ORDER BY id ASC`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	clientes := []fiber.Map{}
	for rows.Next() {
		var id int
		var nombre, dni, ruc, direccion, telefono, email string
		if err := rows.Scan(&id, &nombre, &dni, &ruc, &direccion, &telefono, &email); err != nil {
			continue
		}
		clientes = append(clientes, fiber.Map{
			"id":        id,
			"nombre":    nombre,
			"dni":       dni,
			"ruc":       ruc,
			"direccion": direccion,
			"telefono":  telefono,
			"email":     email,
		})
	}
	return c.JSON(clientes)
}

func createCliente(c *fiber.Ctx) error {
	var req ClienteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "El nombre del cliente es obligatorio"})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}

	var id int64
	err := database.DB.QueryRow(
		"INSERT INTO clientes (nombre, dni, ruc, direccion, telefono, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
		req.Nombre, req.DNI, req.RUC, req.Direccion, req.Telefono, req.Email).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{
		"message":   "Cliente creado",
		"id":        id,
		"nombre":    req.Nombre,
		"dni":       req.DNI,
		"ruc":       req.RUC,
		"direccion": req.Direccion,
		"telefono":  req.Telefono,
		"email":     req.Email,
	})
}

func deleteCliente(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := database.DB.Exec("DELETE FROM clientes WHERE id = $1", id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Cliente eliminado"})
}

// ------------------- Ventas / Comprobantes -------------------

type VentaItemRequest struct {
	ProductoID     int     `json:"producto_id"`
	Nombre         string  `json:"nombre" validate:"required,min=1,max=150"`
	Cantidad       int     `json:"cantidad" validate:"required,gt=0"`
	PrecioUnitario float64 `json:"precio_unitario" validate:"gte=0"`
	Subtotal       float64 `json:"subtotal" validate:"gte=0"`
}

type VentaRequest struct {
	Tipo             string             `json:"tipo" validate:"required,oneof=Factura Boleta factura boleta"`
	Serie            string             `json:"serie" validate:"required,max=10"`
	Numero           string             `json:"numero" validate:"required,max=20"`
	ClienteID        int                `json:"cliente_id"`
	ClienteNombre    string             `json:"cliente_nombre" validate:"required,min=2,max=150"`
	ClienteDocumento string             `json:"cliente_documento" validate:"required,max=20"`
	Direccion        string             `json:"direccion" validate:"max=200"`
	Productos        []VentaItemRequest `json:"productos" validate:"required,min=1,dive"`
	Subtotal         float64            `json:"subtotal" validate:"gte=0"`
	IGV              float64            `json:"igv" validate:"gte=0"`
	Total            float64            `json:"total" validate:"gte=0"`
	MetodoPago       string             `json:"metodo_pago" validate:"required,max=50"`
	Fecha            string             `json:"fecha"`
	Estado           string             `json:"estado"`
}

func getVentas(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, tipo, serie, numero, COALESCE(cliente_id, 0), COALESCE(cliente_nombre, ''),
		       COALESCE(cliente_documento, ''), COALESCE(direccion, ''), subtotal::float8, igv::float8, total::float8,
		       COALESCE(metodo_pago, ''), COALESCE(TO_CHAR(fecha, 'YYYY-MM-DD'), ''), COALESCE(estado, 'Emitida')
		FROM ventas ORDER BY id DESC`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	ventas := []fiber.Map{}
	for rows.Next() {
		var id, clienteID int
		var tipo, serie, numero, clienteNombre, clienteDocumento, direccion, metodoPago, fecha, estado string
		var subtotal, igv, total float64
		if err := rows.Scan(&id, &tipo, &serie, &numero, &clienteID, &clienteNombre, &clienteDocumento,
			&direccion, &subtotal, &igv, &total, &metodoPago, &fecha, &estado); err != nil {
			continue
		}

		itemRows, errItems := database.DB.Query(`
			SELECT COALESCE(producto_id, 0), nombre, cantidad, precio_unitario::float8, subtotal::float8
			FROM venta_items WHERE venta_id = $1`, id)
		productos := []fiber.Map{}
		if errItems == nil {
			for itemRows.Next() {
				var productoID, cantidad int
				var nombre string
				var precioUnitario, subtotalItem float64
				if err := itemRows.Scan(&productoID, &nombre, &cantidad, &precioUnitario, &subtotalItem); err == nil {
					productos = append(productos, fiber.Map{
						"producto_id":     productoID,
						"nombre":          nombre,
						"cantidad":        cantidad,
						"precio_unitario": precioUnitario,
						"subtotal":        subtotalItem,
					})
				}
			}
			itemRows.Close()
		}

		ventas = append(ventas, fiber.Map{
			"id":                id,
			"tipo":              tipo,
			"serie":             serie,
			"numero":            numero,
			"cliente_id":        clienteID,
			"cliente_nombre":    clienteNombre,
			"cliente_documento": clienteDocumento,
			"direccion":         direccion,
			"productos":         productos,
			"subtotal":          subtotal,
			"igv":               igv,
			"total":             total,
			"metodo_pago":       metodoPago,
			"fecha":             fecha,
			"estado":            estado,
		})
	}
	return c.JSON(ventas)
}

func createVenta(c *fiber.Ctx) error {
	var req VentaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body: " + err.Error()})
	}
	if errs := validation.ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos", "details": errs})
	}
	if req.Tipo == "" || len(req.Productos) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "El comprobante debe tener tipo y al menos un producto"})
	}
	if req.Estado == "" {
		req.Estado = "Emitida"
	}
	switch strings.ToLower(req.Tipo) {
	case "boleta":
		req.Tipo = "Boleta"
	case "factura":
		req.Tipo = "Factura"
	}

	tx, err := database.DB.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	var clienteID interface{}
	if req.ClienteID > 0 {
		clienteID = req.ClienteID
	}

	var fecha interface{}
	if req.Fecha != "" {
		fecha = req.Fecha
	}

	var ventaID int64
	err = tx.QueryRow(`
		INSERT INTO ventas (tipo, serie, numero, cliente_id, cliente_nombre, cliente_documento, direccion,
			subtotal, igv, total, metodo_pago, fecha, estado)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
		req.Tipo, req.Serie, req.Numero, clienteID, req.ClienteNombre, req.ClienteDocumento, req.Direccion,
		req.Subtotal, req.IGV, req.Total, req.MetodoPago, fecha, req.Estado).Scan(&ventaID)
	if err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"error": "Error al registrar comprobante: " + err.Error()})
	}

	for _, p := range req.Productos {
		_, err = tx.Exec(`
			INSERT INTO venta_items (venta_id, producto_id, nombre, cantidad, precio_unitario, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			ventaID, p.ProductoID, p.Nombre, p.Cantidad, p.PrecioUnitario, p.Subtotal)
		if err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"error": "Error al registrar el detalle del comprobante"})
		}
	}

	tx.Commit()
	return c.Status(201).JSON(fiber.Map{"message": "Comprobante emitido", "id": ventaID})
}

func anularVenta(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := database.DB.Exec("UPDATE ventas SET estado = 'Anulada' WHERE id = $1", id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Comprobante anulado"})
}
