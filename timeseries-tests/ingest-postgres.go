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

func main() {

	endpointPtr := flag.String("endpoint", "", "servr endpoint")
	batchSize := flag.Int("batchSize", 1, "number of rows to import at once")
	limit := flag.Int("limit", 999999999, "number of rows to import, total")

	flag.Parse()

	fmt.Println("endpoint:", *endpointPtr)
	fmt.Println("batchSize:", *batchSize)

	connStr := "postgres://postgres:password@localhost:6432/postgres?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	//age := 21
	//rows, err := db.Query("SELECT name FROM users WHERE age = $1", age)

	f, err := os.Open("/tmp/sensor_data.csv")
	check(err)

	r := csv.NewReader(f)

	valueStrings := make([]string, 0, *batchSize)
	valueArgs := make([]interface{}, 0, *batchSize*14)

	total := 0
	ordinal := 1

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
			stmt := fmt.Sprintf("INSERT INTO readings VALUES %s", strings.Join(valueStrings, ", "))
			_, err := db.Exec(stmt, valueArgs...)
			check(err)
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
}

