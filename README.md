# QuickPoll - Real-Time Polling Platform

A full-stack enterprise polling application with real-time analytics, built using modern technologies and microservices architecture.

## Overview

QuickPoll is a production-ready polling platform that enables users to create, manage, and participate in polls with real-time results and comprehensive analytics. The system leverages event-driven architecture with Kafka for streaming analytics and provides role-based access control for administrators and regular users.

## Technology Stack

### Backend
- Spring Boot 3.2.0
- Java 21
- Spring Security with JWT authentication
- Spring Data JPA
- PostgreSQL 16
- MapStruct for object mapping
- SpringDoc OpenAPI 3.0

### Frontend
- Angular 21
- TypeScript 5.9
- Tailwind CSS 4.1
- RxJS for reactive programming
- Angular CDK

### Data Engineering
- one shot fargate
- Python 3.12
- Pandas for ETL operations
- PostgreSQL analytics tables

### DevOps
- Docker and Docker Compose
- Terraform for infrastructure as code
- GitHub Actions for CI/CD
- Nginx for frontend serving

### Quality Assurance
- REST Assured for API testing
- Selenium for UI testing
- JUnit 5 and Vitest

## Architecture

The application follows a microservices architecture with the following components:

- **Backend Service**: RESTful API built with Spring Boot, handling authentication, poll management, and voting logic
- **Frontend Application**: Single-page application built with Angular for user interaction
- **Data Pipeline**: Kafka-based streaming pipeline for real-time analytics processing
- **PostgreSQL Database**: Primary data store for operational data and analytics
- **Kafka Cluster**: Message broker for event streaming and analytics

## Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher
- Git

For local development without Docker:
- Java 21
- Node.js 18 or higher
- Python 3.12
- PostgreSQL 16
- Apache Kafka 7.5.0

## Quick Start

### Using Docker Compose

1. Clone the repository:
```bash
git clone <repository-url>
cd quickpoll
```

2. Create environment configuration:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up --build
```

4. Access the application:
- Frontend: http://localhost:4200
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/swagger-ui.html

### Default Users

- Administrator: `admin@quickpoll.com` / `password123`
- Regular User: `user@quickpoll.com` / `password123`

## Project Structure

```
quickpoll/
├── backend/              # Spring Boot REST API
│   ├── src/
│   ├── docs/
│   ├── Dockerfile
│   └── pom.xml
├── frontend/             # Angular application
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── data-engineering/     # Kafka analytics pipeline
│   ├── src/
│   ├── scripts/
│   ├── docs/
│   ├── Dockerfile
│   └── requirements.txt
├── devops/              # Infrastructure and deployment
│   ├── terraform/
│   └── scripts/
├── qa/                  # Quality assurance tests
│   ├── api-tests/
│   └── ui-tests/
├── docs/                # Project documentation
├── docker-compose.yml
└── README.md
```

## Services

### PostgreSQL Database
- Port: 5432
- Database: quickpoll
- Stores operational data and analytics

### Zookeeper
- Port: 2181
- Manages Kafka cluster coordination

### Kafka Broker
- Port: 9092
- Handles event streaming for analytics

### Backend API
- Port: 8080
- RESTful API with JWT authentication
- OpenAPI documentation available

### Data Pipeline
- Consumes Kafka events
- Processes analytics data
- Updates analytics tables

### Frontend
- Port: 4200
- Served via Nginx in production
- Proxies API requests to backend

## Development

### Backend Development

```bash
cd backend
./mvnw spring-boot:run
```

API will be available at http://localhost:8080

### Frontend Development

```bash
cd frontend
npm install
npm start
```

Application will be available at http://localhost:4200

### Data Pipeline Development

```bash
cd data-engineering
pip install -r requirements.txt
python main.py
```

## Testing

### Backend Tests
```bash
cd backend
./mvnw test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### API Integration Tests
```bash
cd qa/api-tests
mvn test
```

### UI Tests
```bash
cd qa/ui-tests
mvn test
```

## Configuration

### Environment Variables

Key environment variables in `.env`:

```
POSTGRES_DB=quickpoll
POSTGRES_USER=quickpoll
POSTGRES_PASSWORD=quickpoll123
BACKEND_PORT=8080
FRONTEND_PORT=4200
JWT_SECRET=<your-secret-key>
```

### Database Configuration

The application uses PostgreSQL with automatic schema initialization. Connection details are configured via environment variables.


## Deployment

### Docker Deployment

The application is containerized and can be deployed using Docker Compose:

```bash
docker-compose -f docker-compose.yml up -d
```

### Cloud Deployment

Terraform configurations for AWS deployment are available in the `devops/terraform` directory. See [devops/README.md](devops/README.md) for detailed deployment instructions.

## Documentation

- [Backend Architecture](backend/docs/architecture.md)
- [Technical Decisions](backend/docs/technical-decisions.md)
- [Data Engineering Guide](data-engineering/README.md)
- [Analytics Pipeline](data-engineering/docs/PIPELINE_ARCHITECTURE.md)
- [DevOps Guide](devops/README.md)
- [API Testing](qa/api-tests/README.md)

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- `ci.yml`: Main CI pipeline for building and testing
- `api-test-ci.yml`: API integration tests
- `data-pipeline.yml`: Data pipeline tests
- `qa.yml`: Quality assurance checks
- `deploy.yml`: Automated deployment

## Contributing

Contributions are welcome. Please ensure:

1. All tests pass before submitting pull requests
2. Code follows existing style conventions
3. New features include appropriate tests
4. Documentation is updated for significant changes

## License

This project is proprietary software developed by AmaliTech.

## Support

For issues and questions, please refer to the project documentation or contact the development team.

