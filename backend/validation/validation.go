package validation

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// ValidateStruct valida un DTO y devuelve un mapa campo->mensaje con los
// errores encontrados (nil si el DTO es válido).
func ValidateStruct(s interface{}) map[string]string {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}

	if errs, ok := err.(validator.ValidationErrors); ok {
		salida := make(map[string]string, len(errs))
		for _, e := range errs {
			salida[e.Field()] = mensaje(e)
		}
		return salida
	}
	return map[string]string{"_": err.Error()}
}

func mensaje(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return "es obligatorio"
	case "email":
		return "debe ser un correo válido"
	case "min":
		return fmt.Sprintf("debe tener al menos %s caracteres", e.Param())
	case "max":
		return fmt.Sprintf("debe tener como máximo %s caracteres", e.Param())
	case "gt":
		return fmt.Sprintf("debe ser mayor que %s", e.Param())
	case "gte":
		return fmt.Sprintf("debe ser mayor o igual a %s", e.Param())
	case "oneof":
		return fmt.Sprintf("debe ser uno de: %s", e.Param())
	case "numeric":
		return "debe ser numérico"
	default:
		return "valor inválido (" + e.Tag() + ")"
	}
}
