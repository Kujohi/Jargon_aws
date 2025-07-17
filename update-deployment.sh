#!/bin/bash

echo "🔄 Updating Jargon AWS Deployment"
echo "================================="

CLUSTER_NAME="jargon-production"
REGION="ap-southeast-1"
ACCOUNT_ID="005626493000"

echo "1. Authenticating with ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

echo "2. Building updated Docker images..."
echo "Building Next.js app..."
docker build -t jargon-nextjs .

echo "Building ML service..."
docker build -t jargon-ml ./time_series_ML

echo "3. Tagging images for ECR..."
docker tag jargon-nextjs:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/jargon-nextjs:latest
docker tag jargon-ml:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/jargon-ml:latest

echo "4. Pushing updated images to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/jargon-nextjs:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/jargon-ml:latest

echo "5. Updating ECS services..."
echo "Updating Next.js service..."
aws ecs update-service --cluster $CLUSTER_NAME --service jargon-nextjs --force-new-deployment --region $REGION

echo "Updating ML service..."
aws ecs update-service --cluster $CLUSTER_NAME --service jargon-ml --force-new-deployment --region $REGION

echo "6. Waiting for deployment to complete..."
echo "This may take a few minutes..."

aws ecs wait services-stable --cluster $CLUSTER_NAME --services jargon-nextjs --region $REGION &
aws ecs wait services-stable --cluster $CLUSTER_NAME --services jargon-ml --region $REGION &

wait

echo "✅ Deployment update complete!"
echo "Your updated application is now live at:"
echo "🌐 http://jargon-alb-180410492.ap-southeast-1.elb.amazonaws.com"

echo ""
echo "Run ./check-deployment-status.sh to verify the status" 