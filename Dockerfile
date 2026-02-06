###############################################################################
# Stage 1: Build the Wagic VPK using VitaSDK
###############################################################################
FROM gnuton/vitasdk-docker:latest AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        git-lfs \
        make \
        cmake \
        zip \
        unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Clone Wagic source
RUN git clone --depth 1 https://github.com/WagicProject/wagic.git wagic

# Copy the Vita-specific CMake build file into the source tree
COPY vita/CMakeLists.txt /build/wagic/projects/mtg/vita/CMakeLists.txt

# Copy the build script
COPY build.sh /build/build.sh
RUN chmod +x /build/build.sh

# Run the build
RUN /build/build.sh

###############################################################################
# Stage 2: Serve the built VPK via a lightweight Python HTTP server
###############################################################################
FROM python:3.12-slim

WORKDIR /app

# Copy the VPK artifact from the build stage
COPY --from=builder /build/output/ /app/output/

# Copy the server script
COPY server.py /app/server.py

EXPOSE 8080

CMD ["python", "server.py"]
