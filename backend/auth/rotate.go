package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"log"
)

// Marcador que usa la semilla SQL para indicar que la contraseña debe generarse.
const seedPasswordMarker = "__ROTATE_ON_START__"

type seededAccount struct {
	email      string
	legacyPass string
}

// seededAccounts son las cuentas creadas por la semilla inicial. legacyPass
// permite detectar contraseñas antiguas ya hasheadas en bases existentes.
var seededAccounts = []seededAccount{
	{email: "admin@saborchugurano.pe", legacyPass: "admin123"},
	{email: "mesero@saborchugurano.pe", legacyPass: "mesero123"},
	{email: "cajero@saborchugurano.pe", legacyPass: "cajero123"},
	{email: "cocina@saborchugurano.pe", legacyPass: "cocina123"},
}

// RotateSeededPasswords sustituye una sola vez las contraseñas por defecto de
// las cuentas sembradas por una contraseña aleatoria fuerte. La nueva clave se
// imprime en los logs del servidor para que el administrador pueda guardarla.
// Es idempotente: si la contraseña ya no es la heredada, no hace nada.
func RotateSeededPasswords(db *sql.DB) {
	for _, acc := range seededAccounts {
		var id int
		var hash string
		if err := db.QueryRow("SELECT id, password_hash FROM users WHERE email = $1", acc.email).Scan(&id, &hash); err != nil {
			continue
		}

		if !CheckPassword(hash, acc.legacyPass) && !CheckPassword(hash, seedPasswordMarker) {
			continue
		}

		nueva, err := randomPassword()
		if err != nil {
			continue
		}
		nuevoHash, err := HashPassword(nueva)
		if err != nil {
			continue
		}
		if _, err := db.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", nuevoHash, id); err == nil {
			log.Printf("[SEGURIDAD] Nueva contraseña para %s: %s (guárdala en un lugar seguro)", acc.email, nueva)
		}
	}
}

func randomPassword() (string, error) {
	b := make([]byte, 18)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
