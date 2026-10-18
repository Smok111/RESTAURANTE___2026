package auth

import (
	"database/sql"
	"fmt"
)

// MigratePlaintextPasswords reemplaza por hashes bcrypt las contraseñas que
// sigan almacenadas en texto plano (datos heredados o semilla inicial).
func MigratePlaintextPasswords(db *sql.DB) {
	rows, err := db.Query("SELECT id, password_hash FROM users")
	if err != nil {
		return
	}

	type rec struct {
		id   int
		hash string
	}
	var pendientes []rec
	for rows.Next() {
		var id int
		var hash string
		if err := rows.Scan(&id, &hash); err == nil && !IsBcryptHash(hash) {
			pendientes = append(pendientes, rec{id, hash})
		}
	}
	rows.Close()

	for _, r := range pendientes {
		nuevo, err := HashPassword(r.hash)
		if err != nil {
			continue
		}
		if _, err := db.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", nuevo, r.id); err == nil {
			fmt.Printf("Contraseña del usuario %d migrada a bcrypt\n", r.id)
		}
	}
	if len(pendientes) > 0 {
		fmt.Printf("%d contraseña(s) migradas a bcrypt\n", len(pendientes))
	}
}
