#!/bin/bash

docker buildx build --platform linux/amd64,linux/arm64 -t nestjs-commerce-microservices/gateway:latest -f ./apps/gateway/Dockerfile --target production .
docker buildx build --platform linux/amd64,linux/arm64 -t nestjs-commerce-microservices/notification:latest -f ./apps/notification/Dockerfile --target production .
docker buildx build --platform linux/amd64,linux/arm64 -t nestjs-commerce-microservices/order:latest -f ./apps/order/Dockerfile --target production .
docker buildx build --platform linux/amd64,linux/arm64 -t nestjs-commerce-microservices/payment:latest -f ./apps/payment/Dockerfile --target production .
docker buildx build --platform linux/amd64,linux/arm64 -t nestjs-commerce-microservices/product:latest -f ./apps/product/Dockerfile --target production .
docker buildx build --platform linux/amd64,linux/arm64 -t nestjs-commerce-microservices/user:latest -f ./apps/user/Dockerfile --target production .

docker push nestjs-commerce-microservices/gateway:latest
docker push nestjs-commerce-microservices/notification:latest
docker push nestjs-commerce-microservices/order:latest
docker push nestjs-commerce-microservices/payment:latest
docker push nestjs-commerce-microservices/product:latest
docker push nestjs-commerce-microservices/user:latest
