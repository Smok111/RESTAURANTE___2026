package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

func ConnectDB() {
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		log.Fatal("DATABASE_URL no está definida. Configura la cadena de conexión de Supabase en backend/.env")
	}

	// El pooler de Supabase (puerto 6543) trabaja en modo transacción y no
	// mantiene prepared statements entre peticiones: forzamos el protocolo
	// simple para que las consultas (y el schema multi-sentencia) funcionen.
	if !strings.Contains(dbUrl, "default_query_exec_mode") {
		if strings.Contains(dbUrl, "?") {
			dbUrl += "&default_query_exec_mode=simple_protocol"
		} else {
			dbUrl += "?default_query_exec_mode=simple_protocol"
		}
	}

	var err error
	DB, err = sql.Open("pgx", dbUrl)
	if err != nil {
		log.Fatalf("No se pudo configurar la conexión a Supabase: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("No hay ping a Supabase: %v", err)
	}

	fmt.Println("Conectado exitosamente a Supabase (PostgreSQL)")

	// Leer y ejecutar el esquema de Postgres (idempotente).
	schemaBytes, err := os.ReadFile("database/schema_postgres.sql")
	if err != nil {
		log.Printf("Aviso: no se pudo leer schema_postgres.sql: %v", err)
	} else {
		if _, err = DB.Exec(string(schemaBytes)); err != nil {
			log.Printf("Aviso: error ejecutando schema_postgres.sql: %v", err)
		} else {
			fmt.Println("Esquema de Supabase inicializado correctamente")
		}
	}
}
