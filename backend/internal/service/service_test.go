package service

import (
	"testing"
	"time"

	"github.com/piotrekg/gardening/backend/internal/models"
	"github.com/piotrekg/gardening/backend/internal/plantlib"
)

func TestValidatePassword(t *testing.T) {
	cases := []struct {
		pw      string
		wantErr bool
	}{
		{"Short1", true},          // too short
		{"alllowercase1", true},   // no uppercase
		{"NoDigitsHere", true},    // no digit
		{"GoodPass1", false},
		{"Zażółć1gęślą", false},   // unicode uppercase counts
	}
	for _, c := range cases {
		err := ValidatePassword(c.pw)
		if (err != nil) != c.wantErr {
			t.Errorf("ValidatePassword(%q) error=%v, wantErr=%v", c.pw, err, c.wantErr)
		}
	}
}

func testLibrary(t *testing.T) *plantlib.Library {
	t.Helper()
	data := []byte(`[
		{"id":"tomato-beefsteak","common_name_pl":"Pomidor","common_name_en":"Tomato","latin_name":"Solanum lycopersicum",
		 "category":"vegetable","lifecycle":"annual","difficulty":"medium","sun_requirement":"full_sun",
		 "water_frequency_days":2,"fertilize_frequency_days":14,"sow_months":[3,4],"transplant_months":[5],
		 "harvest_months":[7,8],"frost_sensitive":true,"companion_plants":["basil"],"antagonist_plants":["fennel"],
		 "typical_height_cm":150,"spacing_cm":50,"care_notes":"x","common_pests":[],"tags":["vegetable"]},
		{"id":"fennel","common_name_pl":"Fenkuł","common_name_en":"Fennel","latin_name":"Foeniculum vulgare",
		 "category":"vegetable","lifecycle":"perennial","difficulty":"medium","sun_requirement":"full_sun",
		 "water_frequency_days":3,"fertilize_frequency_days":30,"sow_months":[4],"transplant_months":[],
		 "harvest_months":[9],"frost_sensitive":true,"companion_plants":[],"antagonist_plants":["tomato-beefsteak"],
		 "typical_height_cm":80,"spacing_cm":30,"care_notes":"x","common_pests":[],"tags":["vegetable"]},
		{"id":"basil","common_name_pl":"Bazylia","common_name_en":"Basil","latin_name":"Ocimum basilicum",
		 "category":"herb","lifecycle":"annual","difficulty":"easy","sun_requirement":"full_sun",
		 "water_frequency_days":2,"fertilize_frequency_days":21,"sow_months":[4,5],"transplant_months":[5,6],
		 "harvest_months":[6,7,8,9],"frost_sensitive":true,"companion_plants":["tomato-beefsteak"],"antagonist_plants":[],
		 "typical_height_cm":40,"spacing_cm":25,"care_notes":"x","common_pests":[],"tags":["herb"]}
	]`)
	lib, err := plantlib.Load("", data)
	if err != nil {
		t.Fatalf("load test library: %v", err)
	}
	return lib
}

func TestComputeCareStatus(t *testing.T) {
	lib := testLibrary(t)
	id := "tomato-beefsteak"
	now := time.Now()

	overdue := now.AddDate(0, 0, -5)
	dueToday := now.AddDate(0, 0, -2)
	fresh := now.Add(-2 * time.Hour)

	cases := []struct {
		name        string
		lastWatered *time.Time
		want        string
	}{
		{"overdue", &overdue, "overdue"},
		{"due today", &dueToday, "due_today"},
		{"ok", &fresh, "ok"},
		{"unknown without any reference", nil, "unknown"},
	}
	for _, c := range cases {
		p := &models.PlantInstance{PlantLibraryID: &id, LastWateredAt: c.lastWatered}
		st := ComputeCareStatus(p, lib)
		if st.Water != c.want {
			t.Errorf("%s: water status = %q, want %q", c.name, st.Water, c.want)
		}
	}

	// Custom plant without library entry is always unknown.
	custom := &models.PlantInstance{}
	if st := ComputeCareStatus(custom, lib); st.Water != "unknown" {
		t.Errorf("custom plant water status = %q, want unknown", st.Water)
	}

	// Planted date seeds the schedule when never watered.
	planted := now.AddDate(0, 0, -10)
	p := &models.PlantInstance{PlantLibraryID: &id, PlantedDate: &planted}
	if st := ComputeCareStatus(p, lib); st.Water != "overdue" {
		t.Errorf("planted 10d ago, never watered: water status = %q, want overdue", st.Water)
	}
}

func TestCustomFrequencyOverride(t *testing.T) {
	lib := testLibrary(t)
	now := time.Now()
	watered := now.AddDate(0, 0, -4) // 4 days ago
	intp := func(v int) *int { return &v }

	// Library tomato waters every 2 days → 4 days ago is overdue.
	id := "tomato-beefsteak"
	base := &models.PlantInstance{PlantLibraryID: &id, LastWateredAt: &watered}
	if st := ComputeCareStatus(base, lib); st.Water != "overdue" {
		t.Errorf("library freq: water = %q, want overdue", st.Water)
	}

	// Override to every 10 days → 4 days ago is ok.
	withOverride := &models.PlantInstance{PlantLibraryID: &id, LastWateredAt: &watered,
		CustomWaterFrequencyDays: intp(10)}
	if st := ComputeCareStatus(withOverride, lib); st.Water != "ok" {
		t.Errorf("override 10d: water = %q, want ok", st.Water)
	}

	// Custom plant (no library) with an override gets a real status instead of unknown.
	custom := &models.PlantInstance{LastWateredAt: &watered, CustomWaterFrequencyDays: intp(3)}
	if st := ComputeCareStatus(custom, lib); st.Water != "overdue" {
		t.Errorf("custom plant + override 3d: water = %q, want overdue", st.Water)
	}
	// ...and without one it stays unknown.
	bare := &models.PlantInstance{LastWateredAt: &watered}
	if st := ComputeCareStatus(bare, lib); st.Water != "unknown" {
		t.Errorf("custom plant no override: water = %q, want unknown", st.Water)
	}
}

func TestApplyCustomFrequency(t *testing.T) {
	intp := func(v int) *int { return &v }
	var dst *int

	if err := applyCustomFrequency(&dst, nil); err != nil || dst != nil {
		t.Errorf("nil input should leave dst unchanged, got %v err=%v", dst, err)
	}
	if err := applyCustomFrequency(&dst, intp(7)); err != nil || dst == nil || *dst != 7 {
		t.Errorf("value 7 should set dst=7, got %v err=%v", dst, err)
	}
	if err := applyCustomFrequency(&dst, intp(0)); err != nil || dst != nil {
		t.Errorf("value 0 should clear dst, got %v err=%v", dst, err)
	}
	if err := applyCustomFrequency(&dst, intp(9999)); err == nil {
		t.Error("out-of-range value should error")
	}
}

func TestLibrarySearch(t *testing.T) {
	lib := testLibrary(t)

	plants, total := lib.Search("pomidor", "", "", 1, 20)
	if total != 1 || len(plants) != 1 || plants[0].ID != "tomato-beefsteak" {
		t.Errorf("search pomidor: got total=%d", total)
	}
	_, total = lib.Search("", "vegetable", "", 1, 20)
	if total != 2 {
		t.Errorf("category filter: got total=%d, want 2", total)
	}
	_, total = lib.Search("", "", "annual", 1, 20)
	if total != 2 {
		t.Errorf("lifecycle filter: got total=%d, want 2", total)
	}
	plants, total = lib.Search("", "", "", 2, 2)
	if total != 3 || len(plants) != 1 {
		t.Errorf("pagination: total=%d page2len=%d, want 3/1", total, len(plants))
	}
}

func TestIsAntagonist(t *testing.T) {
	lib := testLibrary(t)
	tomato, _ := lib.Get("tomato-beefsteak")
	fennel, _ := lib.Get("fennel")
	basil, _ := lib.Get("basil")

	if !isAntagonist(tomato, fennel) {
		t.Error("tomato should list fennel as antagonist")
	}
	if !isAntagonist(fennel, tomato) {
		t.Error("fennel should list tomato as antagonist")
	}
	if isAntagonist(tomato, basil) {
		t.Error("tomato should not be antagonistic to basil")
	}
}
