# Jargon AI: Intelligent Financial Management

Jargon AI is an AI-powered financial planning application designed to help users manage their money using the 6-Jar Money Management method. The app leverages AWS services for authentication, data storage, and machine learning, providing a modern, scalable, and secure financial assistant.

## Features
- 6-Jar money management system
- Predictive and dynamic jar allocation
- Personalized financial recommendations
- Transaction tracking and analytics
- AWS Cognito authentication
- AWS RDS (PostgreSQL) backend
- Modern Next.js frontend

## Tech Stack
- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Node.js, Express (API routes), AWS RDS (PostgreSQL)
- **Authentication:** AWS Cognito
- **ML/AI:** AWS Lambda (for ML tasks)
- **Deployment:** Docker, AWS ECS/Fargate

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- Docker (for containerized deployment)
- AWS account (with Cognito, RDS, and ECS setup)

### Local Development
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables:**
   - Copy `.env.example` to `.env.local` and fill in your AWS and database credentials.
3. **Run the app locally:**
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

### Docker Deployment
1. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```
2. **Production build:**
   ```bash
   npm run build
   npm start
   ```

### AWS Deployment
- Build and push your Docker image to AWS ECR.
- Deploy the container to AWS ECS/Fargate.
- Ensure your RDS and Cognito services are configured and accessible.

## Project Structure
- `app/` - Next.js app source (pages, components, API routes)
- `components/` - Shared React components
- `services/` - AWS and business logic services
- `scripts/` - Utility scripts (for migration, etc.)
- `public/` - Static assets
- `utils/` - Utility functions

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE) 