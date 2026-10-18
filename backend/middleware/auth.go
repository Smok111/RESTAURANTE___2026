package middleware

import (
	"strings"

	"casita-nortena/auth"
	"github.com/gofiber/fiber/v2"
)

// Roles disponibles en el sistema.
const (
	RolAdministrador = 1
	RolMesero        = 2
	RolCajero        = 3
	RolCocinero      = 4
	RolCliente       = 5
)

// RequireAuth valida el JWT (cabecera Authorization: Bearer <token>) y expone
// los datos del usuario en c.Locals.
func RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "No autorizado: se requiere token Bearer",
			})
		}

		token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		claims, err := auth.ParseToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "No autorizado: " + err.Error(),
			})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("user_name", claims.Name)
		c.Locals("user_email", claims.Email)
		c.Locals("role_id", claims.RoleID)
		c.Locals("role_name", claims.RoleName)
		return c.Next()
	}
}

// RequireRoles es un guard de RBAC: solo permite continuar si el rol del token
// está dentro de los roles permitidos.
func RequireRoles(roles ...int) fiber.Handler {
	permitidos := make(map[int]bool, len(roles))
	for _, r := range roles {
		permitidos[r] = true
	}
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role_id").(int)
		if !ok || !permitidos[role] {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso denegado: permisos insuficientes para este recurso",
			})
		}
		return c.Next()
	}
}

// UserID devuelve el id del usuario autenticado (0 si no hay token válido).
func UserID(c *fiber.Ctx) int {
	if v, ok := c.Locals("user_id").(int); ok {
		return v
	}
	return 0
}

// RoleID devuelve el rol del usuario autenticado (0 si no hay token válido).
func RoleID(c *fiber.Ctx) int {
	if v, ok := c.Locals("role_id").(int); ok {
		return v
	}
	return 0
}
