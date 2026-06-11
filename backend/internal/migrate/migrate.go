// Package migrate is a minimal sequential SQL migration runner for PostgreSQL.
//
// It keeps the golang-migrate file naming convention (NNNNNN_name.up.sql) and a
// compatible schema_migrations table (version, dirty). Each migration runs in
// its own transaction with a dirty flag set around execution, so an interrupted
// run is detected and refused on the next start.
package migrate

import (
	"database/sql"
	"fmt"
	"io/fs"
	"sort"
	"strconv"
	"strings"
)

type migration struct {
	version int64
	name    string
	sql     string
}

// Up applies every pending .up.sql migration from fsys in version order.
func Up(db *sql.DB, fsys fs.FS) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version BIGINT PRIMARY KEY, dirty BOOLEAN NOT NULL DEFAULT false)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	var current int64
	var dirty bool
	row := db.QueryRow(`SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 1`)
	if err := row.Scan(&current, &dirty); err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("read schema_migrations: %w", err)
	}
	if dirty {
		return fmt.Errorf("database is dirty at version %d; manual intervention required", current)
	}

	migrations, err := load(fsys)
	if err != nil {
		return err
	}
	for _, m := range migrations {
		if m.version <= current {
			continue
		}
		if err := apply(db, m); err != nil {
			return err
		}
	}
	return nil
}

func load(fsys fs.FS) ([]migration, error) {
	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		return nil, err
	}
	var out []migration
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".up.sql") {
			continue
		}
		parts := strings.SplitN(name, "_", 2)
		version, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return nil, fmt.Errorf("migration %q: invalid version prefix", name)
		}
		body, err := fs.ReadFile(fsys, name)
		if err != nil {
			return nil, err
		}
		out = append(out, migration{version: version, name: name, sql: string(body)})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].version < out[j].version })
	for i := 1; i < len(out); i++ {
		if out[i].version == out[i-1].version {
			return nil, fmt.Errorf("duplicate migration version %d", out[i].version)
		}
	}
	return out, nil
}

// apply runs one migration inside a transaction, marking the dirty flag around
// execution so an interrupted run is detected on restart.
func apply(db *sql.DB, m migration) error {
	if _, err := db.Exec(
		`INSERT INTO schema_migrations (version, dirty) VALUES ($1, true)
		 ON CONFLICT (version) DO UPDATE SET dirty = true`, m.version); err != nil {
		return fmt.Errorf("mark dirty %s: %w", m.name, err)
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec(m.sql); err != nil {
		tx.Rollback()
		return fmt.Errorf("apply %s: %w", m.name, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit %s: %w", m.name, err)
	}
	if _, err := db.Exec(`UPDATE schema_migrations SET dirty = false WHERE version = $1`, m.version); err != nil {
		return fmt.Errorf("clear dirty %s: %w", m.name, err)
	}
	// Keep only the latest row so the table mirrors golang-migrate's shape.
	if _, err := db.Exec(`DELETE FROM schema_migrations WHERE version < $1`, m.version); err != nil {
		return fmt.Errorf("prune schema_migrations: %w", err)
	}
	return nil
}
