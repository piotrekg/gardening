package migrate

import (
	"database/sql"
	"testing"
	"testing/fstest"

	_ "github.com/glebarez/go-sqlite"
)

func testFS() fstest.MapFS {
	return fstest.MapFS{
		"000001_initial.up.sql": {Data: []byte(`CREATE TABLE a (id TEXT PRIMARY KEY);`)},
		"000001_initial.down.sql": {Data: []byte(`DROP TABLE a;`)},
		"000002_more.up.sql": {Data: []byte(`CREATE TABLE b (id TEXT PRIMARY KEY);`)},
	}
}

func TestUpAppliesAndIsIdempotent(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	if err := Up(db, testFS()); err != nil {
		t.Fatalf("first Up: %v", err)
	}
	if err := Up(db, testFS()); err != nil {
		t.Fatalf("second Up should be a no-op: %v", err)
	}

	for _, table := range []string{"a", "b"} {
		var name string
		err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&name)
		if err != nil {
			t.Errorf("table %q not created: %v", table, err)
		}
	}

	var version int64
	var dirty bool
	if err := db.QueryRow(`SELECT version, dirty FROM schema_migrations`).Scan(&version, &dirty); err != nil {
		t.Fatalf("schema_migrations: %v", err)
	}
	if version != 2 || dirty {
		t.Errorf("schema_migrations = (%d, %v), want (2, false)", version, dirty)
	}
}

func TestUpFailsOnBrokenSQL(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
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
