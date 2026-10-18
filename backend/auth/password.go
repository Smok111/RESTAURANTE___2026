package auth

import (
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword genera el hash bcrypt de una contraseña en texto plano.
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// IsBcryptHash indica si el valor almacenado ya es un hash bcrypt.
func IsBcryptHash(h string) bool {
	return strings.HasPrefix(h, "$2a$") ||
		strings.HasPrefix(h, "$2b$") ||
		strings.HasPrefix(h, "$2y$")
}

// CheckPassword compara una contraseña con el hash almacenado. Soporta de forma
// transitoria contraseñas heredadas en texto plano para poder migrarlas.
func CheckPassword(stored, plain string) bool {
	if IsBcryptHash(stored) {
		return bcrypt.CompareHashAndPassword([]byte(stored), []byte(plain)) == nil
	}
	return stored == plain
}
