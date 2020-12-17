package main

import (
	"database/sql"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"log"
	"math"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func worker(format chan []string, values chan []interface{}, done chan bool) {
	connStr := "postgres://postgres:password@localhost:6432/postgres?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	for v := range(values) {
		f := <- format
		stmt := fmt.Sprintf("INSERT INTO readings VALUES %s", strings.Join(f, ", "))
		_, err := db.Exec(stmt, v...)
		check(err)
	}

	done <- true
}

func main() {
	batchSize := flag.Int("batchSize", 100, "number of rows to import at once")
	limit := flag.Int("limit", 1000000000, "number of rows to import, total")
	threads := flag.Int("threads", 16, "number of threads to query in parallel")
	interval := flag.Int("interval", 1000000, "interval for reporting rate")

	flag.Parse()

	formatPipes := make([]chan []string, 0, *threads)
	valuePipes := make([]chan []interface{}, 0, *threads)
	done := make([]chan bool, 0, *threads)
	for i := 0; i < *threads; i++ {
		formatPipes = append(formatPipes, make(chan []string, 2))
		valuePipes = append(valuePipes, make(chan []interface{}, 2))
		done = append(done, make(chan bool))
		go worker(formatPipes[i], valuePipes[i], done[i])
	}

	total := 0
	round := 0

	for ; total < *limit; {
		f, err := os.Open("/tmp/sensor_data.csv")
		check(err)

		r := csv.NewReader(f)

		valueStrings := make([]string, 0, *batchSize)
		valueArgs := make([]interface{}, 0, *batchSize*14)
		ordinal := 1

		// read the header row
		_, err = r.Read()
		check(err)

		start := time.Now()
		for t := 0; t < *interval; t++ {
			record, err := r.Read()
			if err == io.EOF {
				break
			}
			check(err)

			ordinals := make([]string, 0, 14)
			timestamp := time.Now().Format("2006-01-02 15:04:05")
			for _, post := range append([]string{timestamp}, record[2:]...) {
				valueArgs = append(valueArgs, post)
				ordinals = append(ordinals, "$" + strconv.Itoa(ordinal))
				ordinal += 1
			}
			valueStrings = append(valueStrings, "(" + strings.Join(ordinals, ", ") + ")")
			total += 1

			if len(valueStrings) == *batchSize {
				formatPipes[round] <- valueStrings
				valuePipes[round] <- valueArgs
				round = (round + 1) % *threads
				valueStrings = valueStrings[:0]
				valueArgs = valueArgs[:0]
				ordinal = 1
			}
		}
		duration := time.Since(start)
		rate := int(math.Round(float64(*interval) / duration.Seconds()))
		// interval reporting
		fmt.Printf("%d,%d\n", total, rate)
	}

	for i := 0; i < *threads; i++ {
		close(formatPipes[i])
		close(valuePipes[i])
		b := <- done[i]
		if (!b) {
			panic("not done")
		}
	}
}

