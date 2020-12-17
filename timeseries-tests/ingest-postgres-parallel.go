package main

import (
	"database/sql"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"

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
	endpointPtr := flag.String("endpoint", "", "servr endpoint")
	batchSize := flag.Int("batchSize", 1, "number of rows to import at once")
	limit := flag.Int("limit", 999999999, "number of rows to import, total")
	threads := flag.Int("threads", 1, "number of threads to query in parallel")

	flag.Parse()

	fmt.Println("endpoint:", *endpointPtr)
	fmt.Println("batchSize:", *batchSize)

	formatPipes := make([]chan []string, 0, *threads)
	valuePipes := make([]chan []interface{}, 0, *threads)
	done := make([]chan bool, 0, *threads)
	for i := 0; i < *threads; i++ {
		formatPipes = append(formatPipes, make(chan []string, 2 * (*threads)))
		valuePipes = append(valuePipes, make(chan []interface{}, 2 * (*threads)))
		done = append(done, make(chan bool))
		go worker(formatPipes[i], valuePipes[i], done[i])
	}

	f, err := os.Open("/tmp/sensor_data.csv")
	check(err)

	r := csv.NewReader(f)

	valueStrings := make([]string, 0, *batchSize)
	valueArgs := make([]interface{}, 0, *batchSize*14)

	total := 0
	ordinal := 1
	round := 0

	// read the header row
	_, err = r.Read()
	check(err)

	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		check(err)

		ordinals := make([]string, 0, 14)
		for _, post := range record[1:] {
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
			if (*limit <= total) {
				break;
			}
		}
		if (0 == (total % (100000))) {
			fmt.Println(total)
		}
	}

	for i := 0; i < *threads; i += 1 {
		close(formatPipes[i])
		close(valuePipes[i])
		b := <- done[i]
		if (!b) {
			panic("not done")
		}
	}
}

