.PHONY: all backend frontend test vet smoke build-linux deploy clean

all: vet test backend frontend

backend:
	cd backend && go build -o bin/plantdiary-server ./cmd/server/

frontend:
	cd frontend && npm run build

test:
	cd backend && go test ./...

vet:
	cd backend && go vet ./...

# Local dev server (expects JWT_SECRET in the environment).
run: backend
	cd backend && DB_PATH=./data/dev.db UPLOAD_PATH=./data/uploads ./bin/plantdiary-server

build-linux:
	cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath \
		-ldflags="-s -w" -o bin/plantdiary-server-linux-amd64 ./cmd/server/

smoke:
	./scripts/smoke.sh

deploy:
	./scripts/deploy.sh

clean:
	rm -rf backend/bin frontend/dist
