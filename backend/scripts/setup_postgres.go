package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
)

func main() {
	passwords := []string{"", "postgres", "admin", "root", "1234", "123456"}
	var conn *pgx.Conn
	var err error
	var successfulPassword string

	for _, pass := range passwords {
		url := fmt.Sprintf("postgres://postgres:%s@localhost:5432/postgres?sslmode=disable", pass)
		conn, err = pgx.Connect(context.Background(), url)
		if err == nil {
			err = conn.Ping(context.Background())
			if err == nil {
				successfulPassword = pass
				break
			}
			conn.Close(context.Background())
		}
	}

	if conn == nil || err != nil {
		log.Fatalf("No se pudo conectar como usuario postgres con contraseñas comunes: %v", err)
	}
	defer conn.Close(context.Background())

	fmt.Printf("Conectado exitosamente como postgres (contraseña: '%s')\n", successfulPassword)

	// Crear usuario y base de datos (ignorar errores si ya existen)
	_, err = conn.Exec(context.Background(), "CREATE USER admin WITH PASSWORD 'admin_password';")
	if err != nil {
		fmt.Printf("Aviso al crear usuario: %v\n", err)
	} else {
		fmt.Println("Usuario 'admin' creado.")
	}

	_, err = conn.Exec(context.Background(), "CREATE DATABASE casita_nortena OWNER admin;")
	if err != nil {
		fmt.Printf("Aviso al crear bd: %v\n", err)
	} else {
		fmt.Println("Base de datos 'casita_nortena' creada.")
	}
}
