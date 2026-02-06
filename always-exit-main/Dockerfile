FROM python:3.10-alpine
RUN apk update && apk add --no-cache socat g++ musl-dev build-base
COPY main.py /app/main.py
COPY flag.txt /app/flag.txt
WORKDIR /app
EXPOSE 1337
ENV PYTHONUNBUFFERED=1
RUN addgroup -S appgroup && adduser -S -D -H -G appgroup ctf
USER ctf
CMD ["socat", "TCP-LISTEN:1337,reuseaddr,fork", "SYSTEM:python3 -u /app/main.py,pty,stderr,setsid,sigint,sane"]
