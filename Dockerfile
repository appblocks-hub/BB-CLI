# docker build . -t appblocks_1.0.0_nodejs && docker tag appblocks_1.0.0_nodejs:latest devthalal/appblocks_1.0.0_nodejs:latest && docker push devthalal/appblocks_1.0.0_nodejs:latest

FROM node:16.20.1-alpine

# Install required dependencies
RUN apk add --no-cache git

# Create a directory for your application
WORKDIR $home/app/

# Copy the local bb-cli folder to the Docker image
COPY . $home/app/bb-cli/

# Install the package from the local directory
RUN npm install -g $home/app/bb-cli

# Install pm2 globally
RUN npm install pm2 -g

# Install dotenv-ci
RUN npm install dotenv-cli -g

CMD ["bb"]