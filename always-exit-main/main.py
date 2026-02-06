import os
import subprocess
import sys
import tempfile
import traceback
import base64

def main() -> None:
    try:
        user_input = input()
        user_input = base64.b64decode(user_input)

        with tempfile.NamedTemporaryFile(mode="wb", suffix=".py", delete=False) as tmpfile:
            tmpfile.write(b"import sys\n")
            tmpfile.write(b"sys.exit()\n")
            tmpfile.write(user_input)
            tmpfile_path = tmpfile.name

        subprocess.call(
            [sys.executable, tmpfile_path],
            stdin=sys.stdin,stdout=sys.stdout,stderr=sys.stderr
        )

    except Exception:
        sys.stdout.flush()
    finally:
        try:
            os.unlink(tmpfile_path)
        except Exception:
            pass


if __name__ == "__main__":
    main()