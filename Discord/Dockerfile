# Define image
FROM node:latest

# Create working directory
RUN mkdir -p /usr/src/Botelicious
WORKDIR /usr/src/Botelicious

# add `/usr/src/Coris/node_modules/.bin` to $PATH
ENV PATH /usr/src/Botelicious/node_modules/.bin:$PATH

# Copy package.json and
# the entire directory over to working directory
COPY package.json /usr/src/Botelicious
RUN npm install
COPY . /usr/src/Botelicious

# Start
CMD node app.js
