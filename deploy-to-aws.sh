#!/bin/bash

echo "🚀 Starting AWS Deployment for Jargon Financial App"
echo "=================================================="

# Configuration
CLUSTER_NAME="jargon-production"
REGION="ap-southeast-1"
ACCOUNT_ID="005626493000"

echo "1. Creating/Verifying ECS Cluster..."
aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION || \
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION

echo "2. Getting VPC and Subnet Information..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region $REGION)
SUBNET_ARRAY=($SUBNETS)

echo "VPC ID: $VPC_ID"
echo "Subnets: ${SUBNET_ARRAY[@]}"

echo "3. Creating Security Group for Load Balancer..."
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name jargon-alb-sg \
  --description "Security group for Jargon ALB" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=jargon-alb-sg" \
  --query 'SecurityGroups[0].GroupId' --output text --region $REGION)

echo "ALB Security Group ID: $ALB_SG_ID"

# Allow HTTP and HTTPS traffic to ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "HTTP rule already exists"

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "HTTPS rule already exists"

echo "4. Creating Security Group for ECS Tasks..."
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name jargon-ecs-sg \
  --description "Security group for Jargon ECS tasks" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=jargon-ecs-sg" \
  --query 'SecurityGroups[0].GroupId' --output text --region $REGION)

echo "ECS Security Group ID: $ECS_SG_ID"

# Allow traffic from ALB to ECS tasks
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID \
  --region $REGION 2>/dev/null || echo "Port 3000 rule already exists"

aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 8000 \
  --source-group $ALB_SG_ID \
  --region $REGION 2>/dev/null || echo "Port 8000 rule already exists"

echo "5. Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name jargon-alb \
  --subnets ${SUBNET_ARRAY[@]} \
  --security-groups $ALB_SG_ID \
  --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || \
  aws elbv2 describe-load-balancers \
  --names jargon-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text --region $REGION)

echo "ALB ARN: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' --output text --region $REGION)

echo "ALB DNS: $ALB_DNS"

echo "6. Creating Target Groups..."
# Target group for Next.js app
NEXTJS_TG_ARN=$(aws elbv2 create-target-group \
  --name jargon-nextjs-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || \
  aws elbv2 describe-target-groups \
  --names jargon-nextjs-tg \
  --query 'TargetGroups[0].TargetGroupArn' --output text --region $REGION)

# Target group for ML service
ML_TG_ARN=$(aws elbv2 create-target-group \
  --name jargon-ml-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /docs \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || \
  aws elbv2 describe-target-groups \
  --names jargon-ml-tg \
  --query 'TargetGroups[0].TargetGroupArn' --output text --region $REGION)

echo "Next.js Target Group ARN: $NEXTJS_TG_ARN"
echo "ML Target Group ARN: $ML_TG_ARN"

echo "7. Creating ALB Listeners..."
# Create listener for port 80
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$NEXTJS_TG_ARN \
  --region $REGION \
  --query 'Listeners[0].ListenerArn' --output text 2>/dev/null || \
  aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --query 'Listeners[0].ListenerArn' --output text --region $REGION)

echo "Listener ARN: $LISTENER_ARN"

# Create rule for ML service
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 100 \
  --conditions Field=path-pattern,Values="/ml/*" \
  --actions Type=forward,TargetGroupArn=$ML_TG_ARN \
  --region $REGION 2>/dev/null || echo "ML routing rule already exists"

echo "8. Registering ECS Task Definitions..."
aws ecs register-task-definition \
  --cli-input-json file://infrastructure/task-definition-app-final.json \
  --region $REGION

aws ecs register-task-definition \
  --cli-input-json file://infrastructure/task-definition-ml-final.json \
  --region $REGION

echo "9. Creating ECS Services..."
# Create Next.js service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name jargon-nextjs \
  --task-definition jargon-nextjs \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_ARRAY[0]},${SUBNET_ARRAY[1]}],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$NEXTJS_TG_ARN,containerName=nextjs-app,containerPort=3000 \
  --region $REGION 2>/dev/null || echo "Next.js service already exists"

# Create ML service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name jargon-ml \
  --task-definition jargon-ml \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_ARRAY[0]},${SUBNET_ARRAY[1]}],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$ML_TG_ARN,containerName=ml-service,containerPort=8000 \
  --region $REGION 2>/dev/null || echo "ML service already exists"

echo "🎉 Deployment Complete!"
echo "======================"
echo "Your application will be available at: http://$ALB_DNS"
echo "ML service will be available at: http://$ALB_DNS/ml/"
echo ""
echo "It may take a few minutes for the services to become healthy."
echo "You can check the status with:"
echo "aws ecs describe-services --cluster $CLUSTER_NAME --services jargon-nextjs jargon-ml --region $REGION" 