FROM python:3.10-alpine
RUN apk update && apk add --no-cache socat g++ musl-dev build-base
COPY main.py /app/main.py
COPY flag.txt /app/flag.txt
WORKDIR /app
EXPOSE 1337
CMD ["socat", "TCP-LISTEN:1337,reuseaddr,fork", "EXEC:'python3 main.py',stderr"]
