#!/usr/bin/env python3
"""
Basic Python test to verify Python test support
"""

def test_arithmetic():
    """Test basic arithmetic operations"""
    assert 2 + 2 == 4, "Addition failed"
    assert 10 - 5 == 5, "Subtraction failed"
    assert 3 * 4 == 12, "Multiplication failed"
    assert 20 / 4 == 5, "Division failed"

def test_strings():
    """Test string operations"""
    s = "Hello World"
    assert len(s) == 11, f"String length incorrect: {len(s)}"
    assert s.lower() == "hello world", "Lowercase conversion failed"
    assert s.upper() == "HELLO WORLD", "Uppercase conversion failed"
    assert "World" in s, "Substring search failed"

def test_lists():
    """Test list operations"""
    lst = [1, 2, 3, 4, 5]
    assert len(lst) == 5, f"List length incorrect: {len(lst)}"
    assert lst[0] == 1, "List indexing failed"
    assert lst[-1] == 5, "Negative indexing failed"

    lst.append(6)
    assert len(lst) == 6, "List append failed"

def test_dictionaries():
    """Test dictionary operations"""
    d = {"name": "TestMe", "version": "0.7"}
    assert d["name"] == "TestMe", "Dictionary access failed"
    assert "version" in d, "Dictionary key check failed"
    assert len(d) == 2, f"Dictionary length incorrect: {len(d)}"

def main():
    """Run all tests"""
    tests_passed = 0
    tests_failed = 0

    tests = [
        ("Arithmetic", test_arithmetic),
        ("Strings", test_strings),
        ("Lists", test_lists),
        ("Dictionaries", test_dictionaries)
    ]

    for name, test_func in tests:
        try:
            test_func()
            print(f"✓ {name} test passed")
            tests_passed += 1
        except AssertionError as e:
            print(f"✗ {name} test failed: {e}")
            tests_failed += 1
        except Exception as e:
            print(f"✗ {name} test error: {e}")
            tests_failed += 1

    print(f"\nPython tests completed: {tests_passed} passed, {tests_failed} failed")

    if tests_failed > 0:
        exit(1)
    else:
        exit(0)

if __name__ == "__main__":
    main()
