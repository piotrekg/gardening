// Package migrations embeds the SQL migration files into the binary so the
// server can self-migrate on startup with no files on disk.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
