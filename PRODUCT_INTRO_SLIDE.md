# Jargon AI Dashboard – Product Introduction Slide Outline

---

## 1. Product Overview
- **Jargon AI** is an AI-powered financial planning application.
- Helps users manage money using the 6-Jar Money Management method.
- Leverages AWS for authentication, data storage, and machine learning.
- Modern, scalable, and secure financial assistant.
- [TODO: Add a short mission statement or vision here.]

---

## 2. Key Features & User Flows

### 2.1. Authentication & Onboarding
- Secure sign-up and sign-in (AWS Cognito)
- Email verification and password reset
- New user onboarding with jar setup

### 2.2. 6-Jar Money Management System
- Visual dashboard for all jars:
  - Necessity, Play, Education, Investment, Charity, Savings
- Customizable allocation percentages for each jar
- Add monthly income and distribute across jars
- Real-time jar balances and health indicators
- [TODO: Add screenshot of jars dashboard]

### 2.3. Transactions Management
- Add, edit, and categorize transactions (income/expense)
- Automatic and manual transaction classification
- Transaction history with filters (by jar, type, search)
- [TODO: Add screenshot of transaction form/list]

### 2.4. Goal Setting & Savings
- Set and track savings targets/goals
- Visual progress indicators and milestone celebrations
- Predict when a user can reach a savings goal (AI-powered)
- [TODO: Add screenshot of goal tracking]

### 2.5. Personalized Insights & AI Chatbot
- AI assistant for financial advice, budgeting, and product Q&A
- Personalized recommendations based on user data
- Natural language queries (e.g., "How much did I spend on food last month?")
- [TODO: Add screenshot of chatbot interface]

---

## 3. Analytics & Reporting
- Financial overview: account balances, recent transactions
- Income vs. outcome charts (monthly)
- Jar balances over time
- Savings jar growth and projections
- Lifetime balance and spending breakdown by category
- Downloadable/exportable reports [TODO: Confirm if available]
- [TODO: Add screenshots of analytics/charts]

---

## 4. Technology Stack
- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Node.js, Express (API routes), AWS RDS (PostgreSQL)
- **Authentication:** AWS Cognito
- **ML/AI:** AWS Lambda, AWS Bedrock
- **Deployment:** Docker, AWS ECS/Fargate

---

## 5. Getting Started
- Prerequisites: Node.js 18+, npm, Docker, AWS account
- Local development:
  - `npm install`
  - Configure `.env.local` with AWS and DB credentials
  - `npm run dev` (http://localhost:3000)
- Docker deployment: `docker-compose up --build`
- AWS deployment: Push Docker image to ECR, deploy to ECS/Fargate
- [TODO: Add setup diagram or screenshot]

---

## 6. Contact & Contributing
- [TODO: Add team contact info, support email, or Slack/Discord]
- Contributions welcome! See `README.md` for guidelines.
- [TODO: Add GitHub repo link and QR code if presenting]

---

# [END OF OUTLINE] 