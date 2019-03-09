# Define image
FROM node:latest

# Create working directory
RUN mkdir -p /usr/src/Botelicious_tel
WORKDIR /usr/src/Botelicious_tel

# add `/usr/src/Coris/node_modules/.bin` to $PATH
ENV PATH /usr/src/Botelicious_tel/node_modules/.bin:$PATH

# Copy package.json and
# the entire directory over to working directory
COPY package.json /usr/src/Botelicious_tel
RUN npm install
COPY . /usr/src/Botelicious_tel

# Start
CMD node app.js