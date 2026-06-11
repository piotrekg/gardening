package plantlib

import "testing"

func TestLoadMergedCuratedWins(t *testing.T) {
	curated := []byte(`[
		{"id":"tomato-beefsteak","common_name_pl":"Pomidor bawoli","common_name_en":"Beefsteak Tomato",
		 "latin_name":"Solanum lycopersicum","category":"vegetable","lifecycle":"annual","difficulty":"medium",
		 "sun_requirement":"full_sun","water_frequency_days":2,"fertilize_frequency_days":14,
		 "sow_months":[3],"transplant_months":[5],"harvest_months":[8],"frost_sensitive":true,
		 "companion_plants":[],"antagonist_plants":[],"typical_height_cm":150,"spacing_cm":50,
		 "care_notes":"rich","common_pests":[],"tags":["vegetable"]}
	]`)
	catalog := []byte(`[
		{"id":"gbif-1","source":"gbif","family":"Solanaceae","common_name_pl":"","common_name_en":"Tomato",
		 "latin_name":"Solanum lycopersicum","category":"wild","lifecycle":"perennial","difficulty":"medium",
		 "sun_requirement":"full_sun","water_frequency_days":0,"fertilize_frequency_days":0,
		 "sow_months":[],"transplant_months":[],"harvest_months":[],"frost_sensitive":false,
		 "companion_plants":[],"antagonist_plants":[],"typical_height_cm":0,"spacing_cm":0,
		 "care_notes":"","common_pests":[],"tags":["european"]},
		{"id":"gbif-2","source":"gbif","family":"Urticaceae","common_name_pl":"pokrzywa","common_name_en":"Nettle",
		 "latin_name":"Urtica dioica","category":"wild","lifecycle":"perennial","difficulty":"medium",
		 "sun_requirement":"full_sun","water_frequency_days":0,"fertilize_frequency_days":0,
		 "sow_months":[],"transplant_months":[],"harvest_months":[],"frost_sensitive":false,
		 "companion_plants":[],"antagonist_plants":[],"typical_height_cm":0,"spacing_cm":0,
		 "care_notes":"","common_pests":[],"tags":["european"]}
	]`)

	lib, err := LoadMerged(curated, catalog)
	if err != nil {
		t.Fatal(err)
	}
	// The catalog tomato (same latin name) must be dropped; nettle added → 2 total.
	if lib.Count() != 2 {
		t.Fatalf("count = %d, want 2 (curated tomato wins over catalog duplicate)", lib.Count())
	}
	tomato, ok := lib.Get("tomato-beefsteak")
	if !ok || tomato.CareNotes != "rich" || tomato.Source != "curated" {
		t.Errorf("curated tomato should survive with its data, got %+v", tomato)
	}
	if _, ok := lib.Get("gbif-1"); ok {
		t.Error("duplicate catalog tomato should have been dropped")
	}
	nettle, ok := lib.Get("gbif-2")
	if !ok || nettle.Source != "gbif" || nettle.Family != "Urticaceae" {
		t.Errorf("catalog nettle should be present with gbif source")
	}
	// Curated entries sort before catalog entries.
	if lib.ids[0] != "tomato-beefsteak" {
		t.Errorf("first listed = %q, want curated tomato first", lib.ids[0])
	}
}
