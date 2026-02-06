FROM debian:bookworm-slim
RUN apt update && apt install -y socat g++
COPY supervisor.c /app/supervisor.c
COPY flag.c /app/flag.c
COPY flag.txt /app/flag.txt
COPY run.sh /app/run.sh
WORKDIR /app
RUN gcc flag.c -o readflag
RUN chmod 4755 readflag
RUN chown root /app/flag.txt
RUN chmod 400 /app/flag.txt
RUN gcc supervisor.c -o supervisor
EXPOSE 1337
USER nobody
CMD ["socat", "TCP-LISTEN:1337,reuseaddr,fork", "EXEC:/app/run.sh,stderr"]
