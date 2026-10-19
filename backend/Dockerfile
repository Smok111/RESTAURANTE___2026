FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server .

FROM alpine:3.21
RUN adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/server /app/server
COPY --from=build /src/database /app/database
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app
ENV PORT=8080
EXPOSE 8080
CMD ["/app/server"]
