// Command imageimport fetches open-source plant images from Wikimedia Commons
// and writes them as data/plants/images.json — a JSON object mapping plant id to
// an image record (URL + thumbnail + source + license + attribution).
//
// Input is the merged plant library: the curated files (plants.json,
// plants_extra.json, plants_extra2.json) take precedence over the broad GBIF
// catalog (catalog.json) when ids collide. Entries with an empty latin_name are
// skipped, as are plants for which no suitable image is found.
//
// Only the Go standard library is used. Commons is queried politely: one shared
// http.Client, a descriptive User-Agent, per-worker throttling, and exponential
// backoff on 429/5xx. The image lookup uses the search generator over the File
// namespace, requesting imageinfo with url + extmetadata at 800px.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	userAgent   = "PlantDiary/1.0 (piotr@gielerak.pl)"
	commonsAPI  = "https://commons.wikimedia.org/w/api.php"
	throttle    = 60 * time.Millisecond
	maxAttempts = 5
	maxAttrLen  = 120
)

// Plant is the minimal subset of the plant schema this tool needs.
type Plant struct {
	ID           string `json:"id"`
	LatinName    string `json:"latin_name"`
	CommonNameEN string `json:"common_name_en"`
}

// Image is the output record per plant id.
type Image struct {
	ImageURL         string `json:"image_url"`
	ImageThumbURL    string `json:"image_thumb_url"`
	ImageSourceURL   string `json:"image_source_url"`
	ImageLicense     string `json:"image_license"`
	ImageAttribution string `json:"image_attribution"`
}

// Commons API response shapes (only the fields we read).
type commonsResp struct {
	Query struct {
		Pages map[string]struct {
			Title     string `json:"title"`
			ImageInfo []struct {
				URL            string `json:"url"`
				DescriptionURL string `json:"descriptionurl"`
				ThumbURL       string `json:"thumburl"`
				ExtMetadata    struct {
					LicenseShortName struct {
						Value string `json:"value"`
					} `json:"LicenseShortName"`
					Artist struct {
						Value string `json:"value"`
					} `json:"Artist"`
				} `json:"extmetadata"`
			} `json:"imageinfo"`
		} `json:"pages"`
	} `json:"query"`
}

var (
	htmlTagRE = regexp.MustCompile(`<[^>]*>`)
	wsRE      = regexp.MustCompile(`\s+`)
	// thumbWidthRE matches the "<N>px-" width token Wikimedia embeds in thumb
	// URLs (e.g. ".../960px-Foo.jpg"); the requested width is honored only up to
	// the source's native width, so it is not always 800.
	thumbWidthRE = regexp.MustCompile(`/\d+px-`)
	allowedExt   = map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
	}
)

func main() {
	defaultOut := "data/plants/images.json"
	var (
		outPath = flag.String("out", defaultOut, "output path for images.json")
		workers = flag.Int("workers", 10, "number of concurrent workers")
		maxN    = flag.Int("max", 0, "limit number of plants processed (0 = all)")
	)
	flag.Parse()

	plants, err := loadPlants()
	if err != nil {
		fmt.Fprintf(os.Stderr, "fatal: loading plants: %v\n", err)
		os.Exit(1)
	}
	if *maxN > 0 && *maxN < len(plants) {
		plants = plants[:*maxN]
	}
	total := len(plants)
	fmt.Fprintf(os.Stderr, "loaded %d plants to process with %d workers\n", total, *workers)

	client := &http.Client{Timeout: 30 * time.Second}

	var (
		mu      sync.Mutex
		results = make(map[string]Image, total)
		fetched int64
		withImg int64
		jobs    = make(chan Plant)
		wg      sync.WaitGroup
		start   = time.Now()
	)

	worker := func() {
		defer wg.Done()
		for p := range jobs {
			img, ok := fetchImage(client, p.LatinName)
			n := atomic.AddInt64(&fetched, 1)
			if ok {
				atomic.AddInt64(&withImg, 1)
				mu.Lock()
				results[p.ID] = img
				mu.Unlock()
			}
			if n%500 == 0 {
				fmt.Fprintf(os.Stderr, "fetched %d/%d, %d with images (%s)\n",
					n, total, atomic.LoadInt64(&withImg), time.Since(start).Round(time.Second))
			}
		}
	}

	for i := 0; i < *workers; i++ {
		wg.Add(1)
		go worker()
	}
	for _, p := range plants {
		jobs <- p
	}
	close(jobs)
	wg.Wait()

	if err := writeJSON(*outPath, results); err != nil {
		fmt.Fprintf(os.Stderr, "fatal: writing output: %v\n", err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "done: processed %d plants, %d with images, wrote %s in %s\n",
		total, len(results), *outPath, time.Since(start).Round(time.Second))
}

// loadPlants reads the curated files then the catalog, merging and deduping by
// id (curated wins). Entries with an empty latin name are dropped. Order is
// preserved (curated first) so test runs hit the curated set.
func loadPlants() ([]Plant, error) {
	curated := []string{
		"data/plants/plants.json",
		"data/plants/plants_extra.json",
		"data/plants/plants_extra2.json",
	}
	catalog := "data/plants/catalog.json"

	seen := make(map[string]bool)
	var out []Plant

	add := func(path string) error {
		raw, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", path, err)
		}
		var ps []Plant
		if err := json.Unmarshal(raw, &ps); err != nil {
			return fmt.Errorf("parse %s: %w", path, err)
		}
		for _, p := range ps {
			p.LatinName = strings.TrimSpace(p.LatinName)
			if p.ID == "" || p.LatinName == "" || seen[p.ID] {
				continue
			}
			seen[p.ID] = true
			out = append(out, p)
		}
		return nil
	}

	for _, f := range curated {
		if err := add(f); err != nil {
			return nil, err
		}
	}
	if err := add(catalog); err != nil {
		return nil, err
	}
	return out, nil
}

// fetchImage queries Commons for an image of the given latin name. It tries the
// bare name first, then a quoted retry. Returns ok=false if nothing suitable.
func fetchImage(client *http.Client, latin string) (Image, bool) {
	if img, ok := queryCommons(client, latin); ok {
		return img, true
	}
	if img, ok := queryCommons(client, `"`+latin+`"`); ok {
		return img, true
	}
	return Image{}, false
}

// queryCommons performs a single search-generator imageinfo request.
func queryCommons(client *http.Client, search string) (Image, bool) {
	q := url.Values{}
	q.Set("action", "query")
	q.Set("format", "json")
	q.Set("prop", "imageinfo")
	q.Set("generator", "search")
	q.Set("gsrsearch", search)
	q.Set("gsrnamespace", "6")
	q.Set("gsrlimit", "1")
	q.Set("iiprop", "url|extmetadata")
	q.Set("iiurlwidth", "800")
	reqURL := commonsAPI + "?" + q.Encode()

	body, ok := doRequest(client, reqURL)
	if !ok {
		return Image{}, false
	}

	var resp commonsResp
	if err := json.Unmarshal(body, &resp); err != nil {
		return Image{}, false
	}

	for _, page := range resp.Query.Pages {
		if len(page.ImageInfo) == 0 {
			continue
		}
		info := page.ImageInfo[0]

		// Reject non-photo file types by extension on the title or url.
		ext := strings.ToLower(filepath.Ext(page.Title))
		if ext == "" {
			ext = strings.ToLower(filepath.Ext(info.URL))
		}
		if !allowedExt[ext] {
			return Image{}, false
		}

		imageURL := info.ThumbURL
		if imageURL == "" {
			imageURL = info.URL
		}

		// Derive a 320px thumb from the rendered thumb URL by replacing its
		// width token (which may be 800 or smaller for low-res sources).
		thumbURL := imageURL
		if info.ThumbURL != "" {
			thumbURL = thumbWidthRE.ReplaceAllString(info.ThumbURL, "/320px-")
		}

		sourceURL := info.DescriptionURL
		if sourceURL == "" {
			sourceURL = "https://commons.wikimedia.org/wiki/" + page.Title
		}

		return Image{
			ImageURL:         imageURL,
			ImageThumbURL:    thumbURL,
			ImageSourceURL:   sourceURL,
			ImageLicense:     cleanText(info.ExtMetadata.LicenseShortName.Value, 0),
			ImageAttribution: cleanText(info.ExtMetadata.Artist.Value, maxAttrLen),
		}, true
	}
	return Image{}, false
}

// doRequest performs a GET with the polite User-Agent, a per-call throttle, and
// exponential backoff on 429/5xx. Returns ok=false after exhausting attempts.
func doRequest(client *http.Client, reqURL string) ([]byte, bool) {
	backoff := 500 * time.Millisecond
	for attempt := 0; attempt < maxAttempts; attempt++ {
		time.Sleep(throttle)
		req, err := http.NewRequest(http.MethodGet, reqURL, nil)
		if err != nil {
			return nil, false
		}
		req.Header.Set("User-Agent", userAgent)
		resp, err := client.Do(req)
		if err != nil {
			time.Sleep(backoff)
			backoff *= 2
			continue
		}
		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			resp.Body.Close()
			time.Sleep(backoff)
			backoff *= 2
			continue
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, false
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, false
		}
		return body, true
	}
	return nil, false
}

// cleanText strips HTML tags, unescapes a few common entities, collapses
// whitespace, and optionally truncates to maxLen runes (0 = no limit).
func cleanText(s string, maxLen int) string {
	if s == "" {
		return ""
	}
	s = htmlTagRE.ReplaceAllString(s, " ")
	s = strings.NewReplacer(
		"&amp;", "&", "&lt;", "<", "&gt;", ">",
		"&quot;", `"`, "&#39;", "'", "&nbsp;", " ",
	).Replace(s)
	s = strings.TrimSpace(wsRE.ReplaceAllString(s, " "))
	if maxLen > 0 {
		r := []rune(s)
		if len(r) > maxLen {
			s = strings.TrimSpace(string(r[:maxLen]))
		}
	}
	return s
}

// writeJSON marshals results to indented JSON and writes the file atomically
// (write to a temp file in the same dir, then rename).
func writeJSON(path string, results map[string]Image) error {
	data, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, ".images-*.json")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return err
	}
	return os.Rename(tmpName, path)
}
