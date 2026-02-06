import atexit

def read_flag():
    try:
        with open('flag.txt', 'r') as f:
            print(f.read())
    except Exception as e:
        print(f"Error: {e}")

atexit.register(read_flag)
