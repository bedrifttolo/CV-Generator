.PHONY: build validate clean

build:
	python3 generate_cv.py

validate:
	python3 validate_visual.py

clean:
	rm -rf build validation
	mkdir -p build output
