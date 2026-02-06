FROM python:3.13-slim
RUN apt update && apt install -y socat g++ libseccomp-dev
COPY main.py /app/main.py
COPY flag.txt /app/flag.txt
WORKDIR /app
EXPOSE 1337
ENV PYTHONUNBUFFERED=1
USER nobody
CMD ["socat", "TCP-LISTEN:1337,reuseaddr,fork", "EXEC:'python3 main.py',pty,stderr,setsid,sigint,sane"]
