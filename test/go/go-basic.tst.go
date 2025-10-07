package main

import (
	"fmt"
	"os"
)

func testArithmetic() bool {
	tests := []struct {
		name     string
		got      int
		expected int
	}{
		{"Addition", 2 + 2, 4},
		{"Subtraction", 10 - 5, 5},
		{"Multiplication", 3 * 4, 12},
		{"Division", 20 / 4, 5},
	}

	for _, tt := range tests {
		if tt.got != tt.expected {
			fmt.Printf("FAIL: %s test failed: got %d, expected %d\n", tt.name, tt.got, tt.expected)
			return false
		}
		fmt.Printf("PASS: %s test passed\n", tt.name)
	}
	return true
}

func testStrings() bool {
	s := "Hello World"

	if len(s) != 11 {
		fmt.Printf("FAIL: String length test failed: got %d, expected 11\n", len(s))
		return false
	}
	fmt.Println("PASS: String length test passed")

	expected := "Hello World"
	if s != expected {
		fmt.Printf("FAIL: String equality test failed: got %s, expected %s\n", s, expected)
		return false
	}
	fmt.Println("PASS: String equality test passed")

	return true
}

func testSlices() bool {
	slice := []int{1, 2, 3, 4, 5}

	if len(slice) != 5 {
		fmt.Printf("FAIL: Slice length test failed: got %d, expected 5\n", len(slice))
		return false
	}
	fmt.Println("PASS: Slice length test passed")

	if slice[0] != 1 {
		fmt.Printf("FAIL: Slice indexing test failed: got %d, expected 1\n", slice[0])
		return false
	}
	fmt.Println("PASS: Slice indexing test passed")

	slice = append(slice, 6)
	if len(slice) != 6 {
		fmt.Printf("FAIL: Slice append test failed: got %d, expected 6\n", len(slice))
		return false
	}
	fmt.Println("PASS: Slice append test passed")

	return true
}

func testMaps() bool {
	m := map[string]string{
		"name":    "TestMe",
		"version": "0.7",
	}

	if m["name"] != "TestMe" {
		fmt.Printf("FAIL: Map access test failed: got %s, expected TestMe\n", m["name"])
		return false
	}
	fmt.Println("PASS: Map access test passed")

	if _, ok := m["version"]; !ok {
		fmt.Println("FAIL: Map key check test failed")
		return false
	}
	fmt.Println("PASS: Map key check test passed")

	if len(m) != 2 {
		fmt.Printf("FAIL: Map length test failed: got %d, expected 2\n", len(m))
		return false
	}
	fmt.Println("PASS: Map length test passed")

	return true
}

func main() {
	testsPassed := 0
	testsFailed := 0

	tests := []struct {
		name string
		fn   func() bool
	}{
		{"Arithmetic", testArithmetic},
		{"Strings", testStrings},
		{"Slices", testSlices},
		{"Maps", testMaps},
	}

	for _, test := range tests {
		if test.fn() {
			testsPassed++
		} else {
			testsFailed++
		}
	}

	fmt.Printf("\nGo tests completed: %d passed, %d failed\n", testsPassed, testsFailed)

	if testsFailed > 0 {
		os.Exit(1)
	}
}
