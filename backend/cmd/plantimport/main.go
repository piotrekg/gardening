// Command plantimport downloads a broad catalog of European vascular plant
// species from the GBIF public API and writes it as a JSON array matching the
// plantlib.Plant schema. It is the generator behind data/plants/catalog.json.
//
// The catalog provides searchable names (latin + PL/EN vernaculars) for "any"
// European plant; it intentionally carries no care schedules. The server-side
// merge loader drops catalog entries whose latin name collides with a curated
// plant, so collisions with the curated library are harmless here.
//
// Only the Go standard library is used. GBIF is queried politely: one shared
// http.Client, a descriptive User-Agent, per-worker throttling, and exponential
// backoff on 429/5xx.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	userAgent  = "PlantDiary-import/1.0 (piotr@gielerak.pl)"
	gbifBase   = "https://api.gbif.org/v1"
	kingdomKey = 6 // Plantae
)

// Plant mirrors plantlib.Plant: field json tags must match exactly so catalog
// entries validate identically to the curated library.
type Plant struct {
	ID                     string   `json:"id"`
	Source                 string   `json:"source"`
	Family                 string   `json:"family"`
	CommonNamePL           string   `json:"common_name_pl"`
	CommonNameEN           string   `json:"common_name_en"`
	LatinName              string   `json:"latin_name"`
	Category               string   `json:"category"`
	Lifecycle              string   `json:"lifecycle"`
	Difficulty             string   `json:"difficulty"`
	SunRequirement         string   `json:"sun_requirement"`
	WaterFrequencyDays     int      `json:"water_frequency_days"`
	FertilizeFrequencyDays int      `json:"fertilize_frequency_days"`
	SowMonths              []int    `json:"sow_months"`
	TransplantMonths       []int    `json:"transplant_months"`
	HarvestMonths          []int    `json:"harvest_months"`
	FrostSensitive         bool     `json:"frost_sensitive"`
	CompanionPlants        []string `json:"companion_plants"`
	AntagonistPlants       []string `json:"antagonist_plants"`
	TypicalHeightCM        int      `json:"typical_height_cm"`
	SpacingCM              int      `json:"spacing_cm"`
	CareNotes              string   `json:"care_notes"`
	CommonPests            []string `json:"common_pests"`
	Tags                   []string `json:"tags"`
}

// shrubTreeFamilies are families we treat as woody trees/shrubs. Lowercase keys.
var shrubTreeFamilies = map[string]bool{
	"pinaceae":     true,
	"fagaceae":     true,
	"betulaceae":   true,
	"salicaceae":   true,
	"rosaceae":     true, // includes much woody material; best-effort
	"sapindaceae":  true,
	"cupressaceae": true,
	"oleaceae":     true,
}

func categoryForFamily(family string) string {
	if shrubTreeFamilies[strings.ToLower(strings.TrimSpace(family))] {
		return "shrub_tree"
	}
	return "wild"
}

type client struct {
	hc *http.Client
	ua string
}

func newClient() *client {
	return &client{
		hc: &http.Client{Timeout: 30 * time.Second},
		ua: userAgent,
	}
}

// getJSON fetches url and decodes JSON into v, retrying with exponential backoff
// on 429 and 5xx. Returns an error after exhausting retries.
func (c *client) getJSON(u string, v any) error {
	const maxAttempts = 5
	backoff := 500 * time.Millisecond
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			time.Sleep(backoff)
			backoff *= 2
		}
		req, err := http.NewRequest(http.MethodGet, u, nil)
		if err != nil {
			return err // non-retryable
		}
		req.Header.Set("User-Agent", c.ua)
		req.Header.Set("Accept", "application/json")
		resp, err := c.hc.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			lastErr = fmt.Errorf("http %d", resp.StatusCode)
			continue
		}
		if resp.StatusCode != http.StatusOK {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			return fmt.Errorf("http %d", resp.StatusCode)
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}
		if err := json.Unmarshal(body, v); err != nil {
			return fmt.Errorf("decode json: %w", err)
		}
		return nil
	}
	return fmt.Errorf("giving up after %d attempts: %w", maxAttempts, lastErr)
}

// facetResponse is the relevant slice of the occurrence/search facet response.
type facetResponse struct {
	Facets []struct {
		Field  string `json:"field"`
		Counts []struct {
			Name string `json:"name"` // the speciesKey as a string
		} `json:"counts"`
	} `json:"facets"`
}

// collectSpeciesKeys pages the Europe-scoped occurrence facet to gather up to max
// unique speciesKeys, ordered by occurrence count (most common first).
func (c *client) collectSpeciesKeys(max int) ([]string, error) {
	seen := map[string]bool{}
	var keys []string
	const pageSize = 1000
	for offset := 0; len(keys) < max; offset += pageSize {
		q := url.Values{}
		q.Set("continent", "EUROPE")
		q.Set("kingdomKey", fmt.Sprintf("%d", kingdomKey))
		q.Set("rank", "SPECIES")
		q.Set("facet", "speciesKey")
		q.Set("facetLimit", fmt.Sprintf("%d", pageSize))
		q.Set("facetOffset", fmt.Sprintf("%d", offset))
		q.Set("limit", "0")
		u := gbifBase + "/occurrence/search?" + q.Encode()

		var fr facetResponse
		if err := c.getJSON(u, &fr); err != nil {
			return nil, fmt.Errorf("facet page offset=%d: %w", offset, err)
		}
		var counts []string
		for _, f := range fr.Facets {
			if f.Field == "SPECIES_KEY" || strings.EqualFold(f.Field, "speciesKey") {
				for _, ct := range f.Counts {
					counts = append(counts, ct.Name)
				}
			}
		}
		if len(counts) == 0 {
			break // facets exhausted
		}
		for _, k := range counts {
			if k == "" || seen[k] {
				continue
			}
			seen[k] = true
			keys = append(keys, k)
			if len(keys) >= max {
				break
			}
		}
		fmt.Fprintf(os.Stderr, "collected %d/%d species keys\n", len(keys), max)
		time.Sleep(80 * time.Millisecond)
	}
	return keys, nil
}

// speciesDetail is the relevant slice of /species/{key}.
type speciesDetail struct {
	CanonicalName   string `json:"canonicalName"`
	ScientificName  string `json:"scientificName"`
	Family          string `json:"family"`
	Rank            string `json:"rank"`
	TaxonomicStatus string `json:"taxonomicStatus"`
	AcceptedKey     int    `json:"acceptedKey"`
	SpeciesKey      int    `json:"speciesKey"`
}

type vernacularResponse struct {
	Results []struct {
		VernacularName string `json:"vernacularName"`
		Language       string `json:"language"`
	} `json:"results"`
}

// fetchSpecies builds a Plant for one speciesKey, or returns ok=false to skip.
// It resolves a single hop to acceptedKey for synonyms.
func (c *client) fetchSpecies(key string) (Plant, bool) {
	det, ok := c.fetchDetail(key)
	if !ok {
		return Plant{}, false
	}
	// Resolve synonyms one hop via acceptedKey.
	if det.TaxonomicStatus != "" && det.TaxonomicStatus != "ACCEPTED" {
		if det.AcceptedKey == 0 {
			return Plant{}, false
		}
		accKey := fmt.Sprintf("%d", det.AcceptedKey)
		accDet, ok := c.fetchDetail(accKey)
		if !ok || (accDet.TaxonomicStatus != "" && accDet.TaxonomicStatus != "ACCEPTED") {
			return Plant{}, false
		}
		det = accDet
		key = accKey
	}
	if det.Rank != "SPECIES" {
		return Plant{}, false
	}
	if strings.TrimSpace(det.CanonicalName) == "" {
		return Plant{}, false
	}

	pl, en := c.fetchVernaculars(key)

	cat := categoryForFamily(det.Family)
	return Plant{
		ID:                     "gbif-" + key,
		Source:                 "gbif",
		Family:                 det.Family,
		CommonNamePL:           pl,
		CommonNameEN:           en,
		LatinName:              strings.TrimSpace(det.CanonicalName),
		Category:               cat,
		Lifecycle:              "perennial",
		Difficulty:             "medium",
		SunRequirement:         "full_sun",
		WaterFrequencyDays:     0,
		FertilizeFrequencyDays: 0,
		SowMonths:              []int{},
		TransplantMonths:       []int{},
		HarvestMonths:          []int{},
		FrostSensitive:         false,
		CompanionPlants:        []string{},
		AntagonistPlants:       []string{},
		TypicalHeightCM:        0,
		SpacingCM:              0,
		CareNotes:              "",
		CommonPests:            []string{},
		Tags:                   []string{"european", cat},
	}, true
}

func (c *client) fetchDetail(key string) (speciesDetail, bool) {
	var det speciesDetail
	if err := c.getJSON(gbifBase+"/species/"+key, &det); err != nil {
		fmt.Fprintf(os.Stderr, "skip key %s: detail: %v\n", key, err)
		return speciesDetail{}, false
	}
	return det, true
}

func (c *client) fetchVernaculars(key string) (pl, en string) {
	var vr vernacularResponse
	if err := c.getJSON(gbifBase+"/species/"+key+"/vernacularNames?limit=100", &vr); err != nil {
		// Vernaculars are optional; log and continue with empties.
		fmt.Fprintf(os.Stderr, "warn key %s: vernaculars: %v\n", key, err)
		return "", ""
	}
	for _, r := range vr.Results {
		name := strings.TrimSpace(r.VernacularName)
		if name == "" {
			continue
		}
		if pl == "" && r.Language == "pol" {
			pl = name
		}
		if en == "" && r.Language == "eng" {
			en = name
		}
		if pl != "" && en != "" {
			break
		}
	}
	return pl, en
}

func main() {
	maxKeys := flag.Int("max", 6000, "maximum number of species to import")
	out := flag.String("out", "data/plants/catalog.json", "output path for catalog.json")
	workers := flag.Int("workers", 10, "number of concurrent fetch workers")
	flag.Parse()

	if *workers < 1 {
		*workers = 1
	}

	c := newClient()

	fmt.Fprintf(os.Stderr, "collecting Europe species keys (max=%d)...\n", *maxKeys)
	keys, err := c.collectSpeciesKeys(*maxKeys)
	if err != nil {
		fmt.Fprintf(os.Stderr, "fatal: collecting keys: %v\n", err)
		os.Exit(1)
	}
	fmt.Fprintf(os.Stderr, "have %d species keys; fetching details with %d workers\n", len(keys), *workers)

	var (
		keyCh = make(chan string)
		resCh = make(chan Plant)
		done  int64
		total = int64(len(keys))
		wg    sync.WaitGroup
	)

	for i := 0; i < *workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for key := range keyCh {
				p, ok := c.fetchSpecies(key)
				n := atomic.AddInt64(&done, 1)
				if n%500 == 0 {
					fmt.Fprintf(os.Stderr, "fetched %d/%d\n", n, total)
				}
				// Per-worker throttle for politeness.
				time.Sleep(60 * time.Millisecond)
				if ok {
					resCh <- p
				}
			}
		}()
	}

	// Feeder.
	go func() {
		for _, k := range keys {
			keyCh <- k
		}
		close(keyCh)
	}()

	// Closer.
	go func() {
		wg.Wait()
		close(resCh)
	}()

	// Collector with case-insensitive latin-name dedup. Preserves arrival order,
	// which roughly tracks the occurrence-count ranking from the feeder.
	var catalog []Plant
	seenLatin := map[string]bool{}
	for p := range resCh {
		key := strings.ToLower(strings.TrimSpace(p.LatinName))
		if key == "" || seenLatin[key] {
			continue
		}
		seenLatin[key] = true
		catalog = append(catalog, p)
	}

	fmt.Fprintf(os.Stderr, "collected %d unique species; writing %s\n", len(catalog), *out)

	data, err := json.Marshal(catalog)
	if err != nil {
		fmt.Fprintf(os.Stderr, "fatal: marshal catalog: %v\n", err)
		os.Exit(1)
	}
	if err := os.WriteFile(*out, data, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "fatal: write %s: %v\n", *out, err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "done: wrote %d entries to %s\n", len(catalog), *out)
}
