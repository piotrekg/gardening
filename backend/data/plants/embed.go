// Package plantdata bundles the static plant library into the binary so the
// server has no runtime dependency on the JSON file being present on disk.
package plantdata

import _ "embed"

//go:embed plants.json
var PlantsJSON []byte
