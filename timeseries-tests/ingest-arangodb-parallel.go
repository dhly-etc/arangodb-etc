package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"

	driver "github.com/arangodb/go-driver"
	"github.com/arangodb/go-driver/http"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

type Record struct {
	Time	string	"json:time"
	DeviceId	string	"json:device_id"
	BatteryLevel	float64	"json:battery_level"
	BatteryStatus	string	"json:battery_status"
	BatteryTemperature	float64	"json:battery_temperature"
	Bssid	string	"json:bssid"
	CpuAvg1min	float64	"json:cpu_avg_1min"
	CpuAvg5min	float64	"json:cpu_avg_5min"
	CpuAvg15min	float64	"json:cpu_avg_15min"
	MemFree	float64	"json:mem_free"
	MemUsed	float64	"json:mem_used"
	Rssi	float64	"json:rssi"
	Ssid	string	"json:ssid"
}

func worker(pipe chan []Record, done chan bool) {
	conn, err := http.NewConnection(http.ConnectionConfig{
		Endpoints: []string{"http://localhost:8529"},
	})
	check(err)
	client, err := driver.NewClient(driver.ClientConfig{
		Connection: conn,
	})
	check(err)
	db, err := client.Database(nil, "_system")
	check(err)
	coll, err := db.Collection(nil, "test")
	check(err)

	for docs := range pipe {
		_, errs, err := coll.CreateDocuments(nil, docs)
		check(err)
		err = errs.FirstNonNil();
		check(err)
	}

	done <- true
}

func main() {
	endpointPtr := flag.String("endpoint", "", "servr endpoint")
	batchSize := flag.Int("batchSize", 1, "number of rows to import at once")
	limit := flag.Int("limit", 999999999, "number of rows to import, total")
	threads := flag.Int("threads", 1, "number of threads to run in parallel")

	flag.Parse()

	fmt.Println("endpoint:", *endpointPtr)
	fmt.Println("batchSize:", *batchSize)

	f, err := os.Open("/tmp/sensor_data.csv")
	check(err)

	r := csv.NewReader(f)
	docs := make([]Record, 0, *batchSize)
	total := 0
	round := 0

	// read the header row
	_, err = r.Read()
	check(err)

	pipes := make([]chan []Record, 0, *threads)
	done := make([]chan bool, 0, *threads)
	for i := 0; i < *threads; i += 1 {
		pipes = append(pipes, make(chan []Record, 2 * (*threads)))
		done = append(done, make(chan bool, 2* (*threads)))
		go worker(pipes[i], done[i])
	}

	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		check(err)

		floats := make([]float64, 0, 8)
		indices := []int{3, 5, 7, 8, 9, 10, 11, 12}
		for _, index := range indices {
			float, err := strconv.ParseFloat(record[index], 64)
			check(err)
			floats = append(floats, float)
		}

		docs = append(docs, Record{
			Time: record[1],
			DeviceId: record[2],
			BatteryLevel: floats[0],
			BatteryStatus: record[4],
			BatteryTemperature: floats[1],
			Bssid: record[6],
			CpuAvg1min: floats[2],
			CpuAvg5min: floats[3],
			CpuAvg15min: floats[4],
			MemFree: floats[5],
			MemUsed: floats[6],
			Rssi: floats[7],
			Ssid: record[13],
		})
		total += 1

		if len(docs) == *batchSize {
			pipes[round] <- docs
			round = (round + 1) % *threads
			docs = docs[:0]
			if (*limit <= total) {
				break;
			}
		}

		if (0 == (total % (100000))) {
			fmt.Println(total)
		}
	}

	for i := 0; i < *threads; i += 1 {
		close(pipes[i])
		d := <- done[i]
		if (!d) {
			panic("not done")
		}
	}
}

