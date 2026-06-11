package migrate

import (
	"database/sql"
	"os"
	"testing"
	"testing/fstest"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// testDB connects to the Postgres instance named by TEST_DATABASE_URL, skipping
// the test when it is not set (e.g. plain `go test` without a database).
func testDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping Postgres migration test")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatal(err)
	}
	// Start from a clean slate.
	for _, stmt := range []string{
		"DROP TABLE IF EXISTS a", "DROP TABLE IF EXISTS b", "DROP TABLE IF EXISTS schema_migrations",
	} {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("cleanup %q: %v", stmt, err)
		}
	}
	return db
}

func testFS() fstest.MapFS {
	return fstest.MapFS{
		"000001_initial.up.sql":   {Data: []byte(`CREATE TABLE a (id TEXT PRIMARY KEY);`)},
		"000001_initial.down.sql": {Data: []byte(`DROP TABLE a;`)},
		"000002_more.up.sql":      {Data: []byte(`CREATE TABLE b (id TEXT PRIMARY KEY);`)},
	}
}

func TestUpAppliesAndIsIdempotent(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	if err := Up(db, testFS()); err != nil {
		t.Fatalf("first Up: %v", err)
	}
	if err := Up(db, testFS()); err != nil {
		t.Fatalf("second Up should be a no-op: %v", err)
	}

	for _, table := range []string{"a", "b"} {
		var reg string
		if err := db.QueryRow("SELECT to_regclass($1)", table).Scan(&reg); err != nil || reg == "" {
			t.Errorf("table %q not created (regclass=%q err=%v)", table, reg, err)
		}
	}

	var version int64
	var dirty bool
	if err := db.QueryRow("SELECT version, dirty FROM schema_migrations").Scan(&version, &dirty); err != nil {
		t.Fatalf("schema_migrations: %v", err)
	}
	if version != 2 || dirty {
		t.Errorf("schema_migrations = (%d, %v), want (2, false)", version, dirty)
	}
}

func TestUpFailsOnBrokenSQL(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	bad := fstest.MapFS{"000001_bad.up.sql": {Data: []byte(`THIS IS NOT SQL`)}}
	if err := Up(db, bad); err == nil {
		t.Fatal("expected error for invalid SQL")
	}
	// A failed migration leaves the dirty flag set so the next run refuses to proceed.
	if err := Up(db, bad); err == nil {
		t.Fatal("expected dirty-database error on rerun")
	}
}
