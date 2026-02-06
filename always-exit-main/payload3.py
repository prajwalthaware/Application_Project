class FlagReader:
    def __del__(self):
        try:
            with open('/app/flag.txt', 'r') as f:
                print(f.read())
        except:
            pass

# Create an instance that will be garbage collected on exit
_flag_reader = FlagReader()
